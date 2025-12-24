import watermarkImage from "../assets/netsec-watermark.svg";

export default function Watermark() {
  return (
    <div className="watermark-layer" aria-hidden="true">
      <img src={watermarkImage} alt="" className="watermark-logo" />
      <span className="watermark-demo">demo</span>
    </div>
  );
}
