// A short synthesized tone for testing audio controls; not a generated soundtrack.
export function createDemoAudio() {
  const rate=8000, count=rate*2, bytes=new Uint8Array(44+count*2), view=new DataView(bytes.buffer)
  const write=(offset,text)=>{for(let i=0;i<text.length;i++)bytes[offset+i]=text.charCodeAt(i)}
  write(0,'RIFF');view.setUint32(4,36+count*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,count*2,true)
  for(let i=0;i<count;i++)view.setInt16(44+i*2,Math.sin(2*Math.PI*(i<rate?440:660)*i/rate)*6000*Math.sin(Math.PI*(i%rate)/rate)**2,true)
  return 'data:audio/wav;base64,'+btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join(''))
}
