import React from "react";
import { AudioLines, Image as ImageIcon, Package, Pill, Trash2, Upload, UserRound, Video } from "lucide-react";
import { BOUND_ASSET_ACCEPT } from "./viral-remake-state";

export default function BoundReplacementRow({ resource, asset, onChoose, onClear }) {
  const ResourceIcon = resource.type === "person" ? UserRound : resource.type === "detail" ? Pill : Package;
  const UploadedIcon = asset?.type === "audio" ? AudioLines : asset?.type === "image" ? ImageIcon : Video;

  return (
    <article className="remake-bound-resource-row">
      <label
        className={`remake-bound-resource-media${asset ? " has-asset" : ""}`}
        aria-label={asset ? `替换${resource.title}素材` : `上传${resource.title}素材`}
      >
        <input type="file" accept={BOUND_ASSET_ACCEPT} onChange={onChoose} />
        {asset?.type === "image" && (asset.preview || asset.path) ? (
          <img src={asset.preview || asset.path} alt="" />
        ) : asset?.type === "video" && asset.preview ? (
          <video src={asset.preview} muted />
        ) : asset ? (
          <UploadedIcon />
        ) : (
          <ResourceIcon />
        )}
      </label>
      <div className="remake-bound-resource-copy">
        <b>{resource.title}</b>
        <p>{resource.description}</p>
      </div>
      {asset ? (
        <button type="button" className="remake-bound-clear" onClick={onClear}>
          <Trash2 />
          清空
        </button>
      ) : (
        <label className="remake-bound-upload-action">
          <input type="file" accept={BOUND_ASSET_ACCEPT} onChange={onChoose} />
          <Upload />
          上传
        </label>
      )}
    </article>
  );
}
