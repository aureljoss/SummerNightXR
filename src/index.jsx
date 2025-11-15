import "./style.css";
import ReactDOM from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import Experience from "./Experience.jsx";
import XRExperience from "./XRExperience.jsx";
import {
  createXRStore,
  XR,
  XROrigin,
  Controllers,
  TeleportationPlane,
} from "@react-three/xr";

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
        <Controllers />
        <TeleportationPlane
          /** Whether to allow teleportation from left controller. Default is `false` */
          leftHand={true}
          /** Whether to allow teleportation from right controller. Default is `false` */
          rightHand={false}
          /** The maximum distance from the camera to the teleportation point. Default is `10` */
          maxDistance={10}
          /** The radial size of the teleportation marker. Default is `0.25` */
          size={0.25}
        />
        <XRExperience />
        <Experience />
        <XROrigin position={[0.4, 0, 0]} />
      </XR>
    </Canvas>
  </>
);
