import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useXR,useXRPlanes } from "@react-three/xr";

export default function XRExperience() {
  const [placedModels, setPlacedModels] = useState([]);
  const { isPresenting, session } = useXR();
  const { gl, camera } = useThree();
  const wallPlanes = useXRPlanes("wall");

  // Load model and textures
  const { nodes } = useGLTF("./model/Lapinou.glb");
  const bakedTexture = useTexture("./model/Lapinou.jpg");
  bakedTexture.flipY = false;

  // Handle XR select (click) events with simple controller pose
  useEffect(() => {
    if (!session) return;

    const handleSelect = async (event) => {
      console.log("Select event fired");

      try {
        const frame = gl.xr.getFrame?.();
        if (!frame) {
          console.warn("XR frame not available");
          return;
        }

        // Get the input source from the event
        const inputSource = event.inputSource;
        if (!inputSource) {
          console.warn("No input source available");
          return;
        }

        // Try to get the pose directly from the input source's target ray
        const pose = frame.getPose(
          inputSource.targetRaySpace,
          frame.session.renderState.baseLayer.space
        );

        if (pose) {
          console.log("Got pose from input source:", pose.transform.position);

          // Create a new model instance at the hit position
          const newModel = {
            id: Date.now(),
            position: [
              pose.transform.position.x,
              pose.transform.position.y + 0.5, // Adjust for floor level
              pose.transform.position.z,
            ],
          };
          console.log("Placing model at:", newModel.position);
          setPlacedModels((prev) => [...prev, newModel]);
        } else {
          console.warn("Could not get pose from input source");
        }
      } catch (err) {
        console.error("Error during select:", err);
      }
    };

    session.addEventListener("select", handleSelect);
    console.log("Select listener attached");

    return () => {
      session.removeEventListener("select", handleSelect);
    };
  }, [session, gl]);

  return (
    <>
      {/* Background scene */}
      <mesh
        geometry={nodes.baked.geometry}
        position={[0, 0.4, 0]}
        onClick={(event) => console.log("I've been clicked", event)}
      >
        <meshBasicMaterial map={bakedTexture} />
      </mesh>
      {/* Render each placed model */}
      {placedModels.map((model) => (
        <group key={model.id} position={model.position}>
          <mesh geometry={nodes.baked.geometry}>
            <meshBasicMaterial map={bakedTexture} />
          </mesh>
        </group>
      ))}
      {wallPlanes.map((plane) => (
        <XRSpace space={plane.planeSpace}>
          <XRPlaneModel plane={plane}>
            <meshBasicMaterial color="red" />
          </XRPlaneModel>
        </XRSpace>
      ))}
    </>
  );
}
