import "./style.css";
import ReactDOM from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import Experience from "./Experience.jsx";
import { createXRStore, XR, XROrigin } from "@react-three/xr";

const store = createXRStore();

const root = ReactDOM.createRoot(document.querySelector("#root"));

root.render(
  <>
    <button onClick={() => store.enterVR()}>Enter VR</button>
    <button onClick={() => store.enterAR()}>Enter AR</button>
    <Canvas
      flat
      camera={{
        fov: 45,
        near: 0.1,
        far: 200,
        position: [1, 2, 6],
      }}
    >
      <XR store={store}>
        <Experience />
        <XROrigin scale={0.24} position={[-0.5, 0.4, 1.6]} />
      </XR>
    </Canvas>
  </>
);
