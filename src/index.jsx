import "./style.css";
import ReactDOM from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import Experience from "./Experience.jsx";
import XRExperience from "./XRExperience.jsx";
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
        <XROrigin position={[0.4, 0, 0]}>
          <XRExperience />
          <Experience />
        </XROrigin>
      </XR>
    </Canvas>
  </>
);
