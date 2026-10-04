import type {
  CanvasEdgeEntity, CanvasGroup, CanvasNodeEntityV2, CanvasNodeEntityV3, CanvasSnapshot, CanvasTask,
  GenerationConfig, MediaEditorDraft, MediaEditorDraftState, NodeMediaMetadata,
} from './types'
import { layoutCanvas } from './autoLayout'
import { validateConnection } from './connectionRules'
import { createEmptyNodeInput, isPersistableContent, migrateCanvasSnapshot } from './migrateSnapshot'
import { removeMentionTokens } from './mentions'

export type CanvasCommand =
  | { type: 'create-node'; node: CanvasNodeEntityV2 | CanvasNodeEntityV3 }
  | { type: 'move-nodes'; positions: Record<string, CanvasNodeEntityV2['position']>; now: string }
  | { type: 'duplicate-nodes'; duplicates: { sourceNodeId: string; nodeId: string; versionIds: Record<string, string> }[]; now: string }
  | { type: 'set-node-lock'; nodeIds: string[]; locked: boolean; now: string }
  | { type: 'delete-selection'; nodeIds: string[]; edgeIds: string[]; now: string }
  | { type: 'create-edge'; edge: CanvasEdgeEntity; now: string }
  | { type: 'delete-edge'; edgeId: string; now: string }
  | { type: 'delete-edge'; edgeIds: string[]; now: string }
  | { type: 'auto-layout'; now: string }
  | { type: 'update-node-body'; nodeId: string; body: string; now: string }
  | { type: 'update-node-prompt'; nodeId: string; prompt: string; mentionNodeIds: string[]; now: string }
  | { type: 'set-node-media'; nodeId: string; media: NodeMediaMetadata | null; now: string }
  | { type: 'set-generation-config'; nodeId: string; config: GenerationConfig | null; now: string }
  | { type: 'set-voice-target'; nodeId: string; sourceNodeId: string | null; now: string }
  | { type: 'add-reference'; targetNodeId: string; sourceNodeId: string; edgeId: string; mention: boolean; now: string }
  | { type: 'remove-reference'; targetNodeId: string; sourceNodeId: string; deleteEdge: boolean; now: string }
  | { type: 'submit-generation'; resultNode: CanvasNodeEntityV3; task: CanvasTask; edgeId: string; now: string }
  | { type: 'submit-media-operation'; sourceNodeId: string; operationLabel: string; group: CanvasGroup | null; branches: { branchId: string; edgeId: string; node: CanvasNodeEntityV3; task: CanvasTask }[]; now: string }
  | { type: 'update-editor-draft'; draft: MediaEditorDraft; now: string }
  | { type: 'undo-editor-draft' | 'redo-editor-draft' | 'discard-editor-draft'; sourceNodeId: string; now: string }

function isNewId(id: string, entities: object): boolean {
  return id.trim().length > 0 && !Object.hasOwn(entities, id)
}

function withUpdatedAt(snapshot: CanvasSnapshot, now: string): CanvasSnapshot {
  return { ...snapshot, canvas: { ...snapshot.canvas, updatedAt: now } }
}

function updateNodeInput(
  snapshot: CanvasSnapshot,
  nodeId: string,
  now: string,
  update: (input: NonNullable<CanvasNodeEntityV3['input']>) => NonNullable<CanvasNodeEntityV3['input']>,
): CanvasSnapshot {
  const node = snapshot.nodesById[nodeId]
  if (!node) return snapshot
  const input = update(node.input ? structuredClone(node.input) : createEmptyNodeInput())
  if (JSON.stringify(input) === JSON.stringify(node.input ?? createEmptyNodeInput())) return snapshot
  return withUpdatedAt({ ...snapshot, nodesById: { ...snapshot.nodesById, [nodeId]: { ...node, input, updatedAt: now } } }, now)
}

function moveNodes(snapshot: CanvasSnapshot, positions: Record<string, CanvasNodeEntityV2['position']>, now: string): CanvasSnapshot {
  if (Object.values(positions).some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) return snapshot
  const nodesById = { ...snapshot.nodesById }
  let changed = false
  for (const [id, position] of Object.entries(positions)) {
    if (!Object.hasOwn(nodesById, id)) continue
    const node = nodesById[id]
    if (node.locked || (node.position.x === position.x && node.position.y === position.y)) continue
    nodesById[id] = { ...node, position: { ...position }, updatedAt: now }
    changed = true
  }
  return changed ? withUpdatedAt({ ...snapshot, nodesById }, now) : snapshot
}

function deleteSelection(snapshot: CanvasSnapshot, nodeIds: string[], edgeIds: string[], now: string): CanvasSnapshot {
  const deletedNodes = new Set(nodeIds.filter((id) => Object.hasOwn(snapshot.nodesById, id) && !snapshot.nodesById[id].locked))
  const selectedEdges = new Set(edgeIds)
  const deletedEdges = new Set(snapshot.edgeOrder.filter((id) => selectedEdges.has(id)
    || deletedNodes.has(snapshot.edgesById[id].sourceNodeId) || deletedNodes.has(snapshot.edgesById[id].targetNodeId)))
  if (deletedNodes.size === 0 && deletedEdges.size === 0) return snapshot

  const edgesById = { ...snapshot.edgesById }
  for (const id of deletedEdges) delete edgesById[id]
  let result = { ...snapshot, edgesById, edgeOrder: snapshot.edgeOrder.filter((id) => !deletedEdges.has(id)) }
  if (deletedNodes.size > 0) {
    const nodesById = { ...snapshot.nodesById }
    const versionsById = { ...snapshot.versionsById }
    const tasksById = { ...snapshot.tasksById }
    const groupsById = { ...snapshot.groupsById }
    for (const id of deletedNodes) delete nodesById[id]
    for (const version of Object.values(versionsById)) if (deletedNodes.has(version.nodeId)) delete versionsById[version.id]
    for (const task of Object.values(tasksById)) if (deletedNodes.has(task.nodeId)) delete tasksById[task.id]
    for (const group of Object.values(groupsById)) {
      const ids = group.nodeIds.filter((id) => !deletedNodes.has(id))
      if (ids.length === 0) delete groupsById[group.id]
      else if (ids.length !== group.nodeIds.length) groupsById[group.id] = { ...group, nodeIds: ids, updatedAt: now }
    }
    result = { ...result, nodesById, nodeOrder: snapshot.nodeOrder.filter((id) => !deletedNodes.has(id)),
      versionsById, versionOrder: snapshot.versionOrder.filter((id) => Object.hasOwn(versionsById, id)), tasksById, groupsById,
      groupOrder: snapshot.groupOrder.filter((id) => Object.hasOwn(groupsById, id)) }
  }
  return withUpdatedAt(result, now)
}

function draftState(draft: MediaEditorDraft): MediaEditorDraftState {
  return { inPoint: draft.inPoint, outPoint: draft.outPoint, crop: structuredClone(draft.crop), clipNodeIds: [...draft.clipNodeIds] }
}

export function applyCanvasCommand(snapshot: CanvasSnapshot, command: CanvasCommand): CanvasSnapshot {
  switch (command.type) {
    case 'create-node': {
      const node: CanvasNodeEntityV3 = 'input' in command.node
        ? command.node
        : { ...command.node, input: createEmptyNodeInput() }
      if (!isNewId(node.id, snapshot.nodesById)
        || node.versionIds.some((id) => !Object.hasOwn(snapshot.versionsById, id) || snapshot.versionsById[id].nodeId !== node.id)
        || (node.currentVersionId !== null && !node.versionIds.includes(node.currentVersionId))
        || (node.taskId !== null && (!Object.hasOwn(snapshot.tasksById, node.taskId) || snapshot.tasksById[node.taskId].nodeId !== node.id))) return snapshot
      const result = withUpdatedAt({ ...snapshot,
        nodesById: { ...snapshot.nodesById, [node.id]: { ...node, position: { ...node.position }, display: { ...node.display }, versionIds: [...node.versionIds] } },
        nodeOrder: [...snapshot.nodeOrder, node.id],
      }, node.updatedAt)
      return migrateCanvasSnapshot(result, snapshot).status === 'loaded' ? result : snapshot
    }
    case 'move-nodes': return moveNodes(snapshot, command.positions, command.now)
    case 'duplicate-nodes': {
      if (command.duplicates.length === 0) return snapshot
      let nodesById = { ...snapshot.nodesById }
      let versionsById = { ...snapshot.versionsById }
      const nodeOrder = [...snapshot.nodeOrder]
      const versionOrder = [...snapshot.versionOrder]
      for (const duplicate of command.duplicates) {
        if (!Object.hasOwn(snapshot.nodesById, duplicate.sourceNodeId) || !isNewId(duplicate.nodeId, nodesById)) return snapshot
        const source = snapshot.nodesById[duplicate.sourceNodeId]
        const newVersionIds: string[] = []
        for (const versionId of source.versionIds) {
          const newId = duplicate.versionIds[versionId]
          if (!Object.hasOwn(duplicate.versionIds, versionId) || !newId || !isNewId(newId, versionsById) || !Object.hasOwn(snapshot.versionsById, versionId)) return snapshot
          const version = snapshot.versionsById[versionId]
          if (version.nodeId !== source.id) return snapshot
          versionsById = { ...versionsById, [newId]: { id: newId, nodeId: duplicate.nodeId, createdAt: command.now,
            content: isPersistableContent(version.content, source) ? version.content : null } }
          newVersionIds.push(newId)
          versionOrder.push(newId)
        }
        if (source.currentVersionId !== null && !source.versionIds.includes(source.currentVersionId)) return snapshot
        nodesById = { ...nodesById, [duplicate.nodeId]: { id: duplicate.nodeId, type: source.type, role: source.role, name: source.name, locked: source.locked,
          position: { x: source.position.x + 32, y: source.position.y + 32 }, display: { width: source.display.width, height: source.display.height },
          versionIds: newVersionIds, currentVersionId: source.currentVersionId === null ? null : duplicate.versionIds[source.currentVersionId],
          taskId: null, input: structuredClone(source.input), createdAt: command.now, updatedAt: command.now } }
        nodeOrder.push(duplicate.nodeId)
      }
      return withUpdatedAt({ ...snapshot, nodesById, nodeOrder, versionsById, versionOrder }, command.now)
    }
    case 'set-node-lock': {
      const nodesById = { ...snapshot.nodesById }
      let changed = false
      for (const id of command.nodeIds) {
        if (!Object.hasOwn(nodesById, id) || nodesById[id].locked === command.locked) continue
        nodesById[id] = { ...nodesById[id], locked: command.locked, updatedAt: command.now }
        changed = true
      }
      return changed ? withUpdatedAt({ ...snapshot, nodesById }, command.now) : snapshot
    }
    case 'delete-selection': return deleteSelection(snapshot, command.nodeIds, command.edgeIds, command.now)
    case 'create-edge': {
      const { edge } = command
      if (!isNewId(edge.id, snapshot.edgesById) || !validateConnection(snapshot, edge.sourceNodeId, edge.targetNodeId, edge.relationType).ok
        || (edge.sourceVersionId !== null && (!Object.hasOwn(snapshot.versionsById, edge.sourceVersionId)
          || snapshot.versionsById[edge.sourceVersionId].nodeId !== edge.sourceNodeId))) return snapshot
      const created = withUpdatedAt({ ...snapshot, edgesById: { ...snapshot.edgesById, [edge.id]: { ...edge } }, edgeOrder: [...snapshot.edgeOrder, edge.id] }, command.now)
      return edge.relationType === 'reference' ? updateNodeInput(created, edge.targetNodeId, command.now, (input) => ({ ...input,
        referenceNodeIds: input.referenceNodeIds.includes(edge.sourceNodeId) ? input.referenceNodeIds : [...input.referenceNodeIds, edge.sourceNodeId],
      })) : created
    }
    case 'delete-edge': return deleteSelection(snapshot, [], 'edgeIds' in command ? command.edgeIds : [command.edgeId], command.now)
    case 'auto-layout': return moveNodes(snapshot, layoutCanvas(snapshot), command.now)
    case 'update-node-body': return updateNodeInput(snapshot, command.nodeId, command.now, (input) => ({ ...input, body: command.body }))
    case 'update-node-prompt': {
      const ids = [...new Set(command.mentionNodeIds)].filter((id) => id !== command.nodeId && Object.hasOwn(snapshot.nodesById, id))
      return updateNodeInput(snapshot, command.nodeId, command.now, (input) => ({ ...input, prompt: command.prompt, mentionNodeIds: ids,
        referenceNodeIds: [...new Set([...input.referenceNodeIds, ...ids])],
      }))
    }
    case 'set-node-media': return updateNodeInput(snapshot, command.nodeId, command.now, (input) => ({ ...input, media: command.media ? { ...command.media } : null }))
    case 'set-generation-config': return updateNodeInput(snapshot, command.nodeId, command.now, (input) => ({ ...input, generationConfig: command.config ? { ...command.config } : null }))
    case 'set-voice-target': {
      if (command.sourceNodeId !== null && (!Object.hasOwn(snapshot.nodesById, command.sourceNodeId)
        || snapshot.nodesById[command.sourceNodeId].type !== 'audio' || command.sourceNodeId === command.nodeId)) return snapshot
      return updateNodeInput(snapshot, command.nodeId, command.now, (input) => ({ ...input, voiceTargetNodeId: command.sourceNodeId }))
    }
    case 'add-reference': {
      if (!Object.hasOwn(snapshot.nodesById, command.targetNodeId) || !Object.hasOwn(snapshot.nodesById, command.sourceNodeId)
        || command.targetNodeId === command.sourceNodeId) return snapshot
      let result = updateNodeInput(snapshot, command.targetNodeId, command.now, (input) => ({
        ...input,
        mentionNodeIds: command.mention && !input.mentionNodeIds.includes(command.sourceNodeId)
          ? [...input.mentionNodeIds, command.sourceNodeId] : input.mentionNodeIds,
        referenceNodeIds: input.referenceNodeIds.includes(command.sourceNodeId)
          ? input.referenceNodeIds : [...input.referenceNodeIds, command.sourceNodeId],
      }))
      const exists = result.edgeOrder.some((id) => {
        const edge = result.edgesById[id]
        return edge.sourceNodeId === command.sourceNodeId && edge.targetNodeId === command.targetNodeId && edge.relationType === 'reference'
      })
      if (!exists && !validateConnection(snapshot, command.sourceNodeId, command.targetNodeId, 'reference').ok) return snapshot
      if (!exists) result = applyCanvasCommand(result, { type: 'create-edge', now: command.now, edge: {
        id: command.edgeId, sourceNodeId: command.sourceNodeId, targetNodeId: command.targetNodeId,
        relationType: 'reference', sourceVersionId: result.nodesById[command.sourceNodeId].currentVersionId,
      } })
      return result
    }
    case 'remove-reference': {
      if (!Object.hasOwn(snapshot.nodesById, command.targetNodeId)) return snapshot
      let result = updateNodeInput(snapshot, command.targetNodeId, command.now, (input) => ({
        ...input,
        prompt: removeMentionTokens(input.prompt, command.sourceNodeId),
        mentionNodeIds: input.mentionNodeIds.filter((id) => id !== command.sourceNodeId),
        referenceNodeIds: input.referenceNodeIds.filter((id) => id !== command.sourceNodeId),
        voiceTargetNodeId: input.voiceTargetNodeId === command.sourceNodeId ? null : input.voiceTargetNodeId,
      }))
      if (command.deleteEdge) {
        const edgeIds = result.edgeOrder.filter((id) => {
          const edge = result.edgesById[id]
          return edge.sourceNodeId === command.sourceNodeId && edge.targetNodeId === command.targetNodeId && edge.relationType === 'reference'
        })
        if (edgeIds.length > 0) result = applyCanvasCommand(result, { type: 'delete-edge', edgeIds, now: command.now })
      }
      return result
    }
    case 'submit-generation': {
      const { resultNode, task } = command
      const sourceId = task.sourceNodeId
      if (!sourceId || !Object.hasOwn(snapshot.nodesById, sourceId) || !isNewId(resultNode.id, snapshot.nodesById)
        || !isNewId(task.id, snapshot.tasksById) || task.resultNodeId !== resultNode.id || task.nodeId !== resultNode.id
        || resultNode.taskId !== task.id || !isNewId(command.edgeId, snapshot.edgesById)) return snapshot
      const withTask = { ...snapshot, tasksById: { ...snapshot.tasksById, [task.id]: structuredClone(task) } }
      const created = applyCanvasCommand(withTask, { type: 'create-node', node: resultNode })
      if (created === withTask) return snapshot
      const withEdge = applyCanvasCommand(created, { type: 'create-edge', now: command.now, edge: {
        id: command.edgeId, sourceNodeId: sourceId, targetNodeId: resultNode.id, relationType: 'derived',
        sourceVersionId: snapshot.nodesById[sourceId].currentVersionId, operationLabel: '生成',
      } })
      if (withEdge === created) return snapshot
      return withUpdatedAt(withEdge, command.now)
    }
    case 'submit-media-operation': {
      if (!Object.hasOwn(snapshot.nodesById, command.sourceNodeId) || command.branches.length === 0) return snapshot
      const nodeIds = new Set<string>(), taskIds = new Set<string>(), edgeIds = new Set<string>(), branchIds = new Set<string>()
      for (const branch of command.branches) {
        if (!branch.branchId || branchIds.has(branch.branchId) || !isNewId(branch.node.id, snapshot.nodesById)
          || nodeIds.has(branch.node.id) || !isNewId(branch.task.id, snapshot.tasksById) || taskIds.has(branch.task.id)
          || !isNewId(branch.edgeId, snapshot.edgesById) || edgeIds.has(branch.edgeId)
          || branch.node.taskId !== branch.task.id || branch.task.nodeId !== branch.node.id || branch.task.resultNodeId !== branch.node.id
          || branch.task.sourceNodeId !== command.sourceNodeId || branch.task.request?.branchId !== branch.branchId
          || branch.task.request.operation?.sourceNodeId !== command.sourceNodeId || branch.task.request.operation.outputType !== branch.node.type) return snapshot
        branchIds.add(branch.branchId); nodeIds.add(branch.node.id); taskIds.add(branch.task.id); edgeIds.add(branch.edgeId)
      }
      if (command.group && (!isNewId(command.group.id, snapshot.groupsById)
        || command.group.nodeIds.length !== command.branches.length || command.group.nodeIds.some((id) => !nodeIds.has(id)))) return snapshot
      let result = snapshot
      for (const branch of command.branches) {
        const withTask = { ...result, tasksById: { ...result.tasksById, [branch.task.id]: structuredClone(branch.task) } }
        const withNode = applyCanvasCommand(withTask, { type: 'create-node', node: branch.node })
        if (withNode === withTask) return snapshot
        const withEdge = applyCanvasCommand(withNode, { type: 'create-edge', now: command.now, edge: {
          id: branch.edgeId, sourceNodeId: command.sourceNodeId, targetNodeId: branch.node.id, relationType: 'derived',
          sourceVersionId: snapshot.nodesById[command.sourceNodeId].currentVersionId, operationLabel: command.operationLabel,
        } })
        if (withEdge === withNode) return snapshot
        result = withEdge
      }
      if (command.group) result = { ...result, groupsById: { ...result.groupsById, [command.group.id]: structuredClone(command.group) }, groupOrder: [...result.groupOrder, command.group.id] }
      return withUpdatedAt(result, command.now)
    }
    case 'update-editor-draft': {
      if (!Object.hasOwn(snapshot.nodesById, command.draft.sourceNodeId)) return snapshot
      const previous = snapshot.editorDraftsBySourceId[command.draft.sourceNodeId]
      const next = structuredClone(command.draft)
      if (previous) {
        const previousState = draftState(previous)
        const nextState = draftState(next)
        if (JSON.stringify(previousState) === JSON.stringify(nextState)) return snapshot
        next.undoStack = [...previous.undoStack, previousState].slice(-50)
        next.redoStack = []
      }
      return withUpdatedAt({ ...snapshot, editorDraftsBySourceId: { ...snapshot.editorDraftsBySourceId, [next.sourceNodeId]: next } }, command.now)
    }
    case 'undo-editor-draft':
    case 'redo-editor-draft': {
      const draft = snapshot.editorDraftsBySourceId[command.sourceNodeId]
      if (!draft) return snapshot
      const from = command.type === 'undo-editor-draft' ? draft.undoStack : draft.redoStack
      if (from.length === 0) return snapshot
      const restored = from.at(-1)!
      const current = draftState(draft)
      const next: MediaEditorDraft = { ...draft, ...structuredClone(restored), updatedAt: command.now,
        undoStack: command.type === 'undo-editor-draft' ? from.slice(0, -1) : [...draft.undoStack, current],
        redoStack: command.type === 'redo-editor-draft' ? from.slice(0, -1) : [...draft.redoStack, current] }
      return withUpdatedAt({ ...snapshot, editorDraftsBySourceId: { ...snapshot.editorDraftsBySourceId, [command.sourceNodeId]: next } }, command.now)
    }
    case 'discard-editor-draft': {
      if (!Object.hasOwn(snapshot.editorDraftsBySourceId, command.sourceNodeId)) return snapshot
      const editorDraftsBySourceId = { ...snapshot.editorDraftsBySourceId }
      delete editorDraftsBySourceId[command.sourceNodeId]
      return withUpdatedAt({ ...snapshot, editorDraftsBySourceId }, command.now)
    }
  }
}
