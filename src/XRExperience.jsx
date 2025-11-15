import * as THREE from "three";
import { extend, useFrame } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useXR } from "@react-three/xr";

export default function XRExperience() {
  const [placedModels, setPlacedModels] = useState([]);
  const hitTestSourceRef = useRef(null);
  const frameRef = useRef();
  const { isPresenting, session } = useXR();

  // Load model and textures
  const { nodes } = useGLTF("./model/Lapinou.glb");
  const bakedTexture = useTexture("./model/Lapinou.jpg");
  bakedTexture.flipY = false;

  // Initialize hit test source when XR session starts
  useEffect(() => {
    if (!session) return;

    const initHitTest = async () => {
      try {
        // For AR, we need to request hit test results with a plane
        const hitTestSource = await session.requestHitTestSource({
          space: session.inputSpace,
          entityTypes: ["plane"],
          offsetRay: new XRRay({ y: 0.5 }),
        });
        hitTestSourceRef.current = hitTestSource;
        console.log("Hit test source initialized:", hitTestSource);
      } catch (err) {
        console.error("Hit test setup failed:", err);
      }
    };

    initHitTest();
  }, [session]);

  // Handle XR select (click) events
  useEffect(() => {
    if (!session) return;

    const handleSelect = (event) => {
      console.log("Select event fired");

      if (!hitTestSourceRef.current) {
        console.warn("Hit test source not initialized");
        return;
      }

      // Get the frame to access hit test results
      if (frameRef.current) {
        const hitTestResults = frameRef.current.getHitTestResults(
          hitTestSourceRef.current
        );
        console.log("Hit test results:", hitTestResults.length);

        if (hitTestResults.length > 0) {
          // Get the pose of the first hit test result
          const pose = hitTestResults[0].getPose(
            frameRef.current.session.renderState.baseLayer.space
          );
          console.log("Hit pose:", pose);

          if (pose) {
            // Create a new model instance at the hit position
            const newModel = {
              id: Date.now(),
              position: [
                pose.transform.position.x,
                pose.transform.position.y,
                pose.transform.position.z,
              ],
            };
            console.log("Placing model at:", newModel.position);
            setPlacedModels((prev) => [...prev, newModel]);
          }
        }
      }
    };

    session.addEventListener("select", handleSelect);
    console.log("Select listener attached");

    return () => {
      session.removeEventListener("select", handleSelect);
    };
  }, [session]);

  // Capture the current frame in useFrame
  const { frame } = useFrame();
  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  return (
    <>
      {/* Background scene */}
      <mesh geometry={nodes.baked.geometry} position={[0, 0, 0]}>
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
    </>
  );
}
