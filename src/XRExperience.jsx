import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useXR, useXRPlanes } from "@react-three/xr";

export default function XRExperience() {
  const [placedModels, setPlacedModels] = useState([]);
  const { isPresenting, session } = useXR();
  const { gl, camera } = useThree();

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
              pose.transform.position.y - 0.5, // Adjust for floor level
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
  // Floor mesh reference and raycaster for fallback placement
  const floorRef = useRef();
  const raycaster = useRef(new THREE.Raycaster());

  // Ensure an invisible floor mesh exists in the scene (y = 0)
  // We'll render the mesh in JSX (invisible) so raycaster can intersect it.

  // Handle XR select (click) events with controller-based raycasting to floor
  useEffect(() => {
    if (!session) return;

    const handleSelect = async (event) => {
      console.log("Select event fired (XR)");

      try {
        const frame = gl.xr.getFrame?.();
        if (!frame) {
          console.warn("XR frame not available");
          return;
        }

        const inputSource = event.inputSource;
        if (!inputSource) {
          console.warn("No input source available");
          return;
        }

        // Get the controller target ray pose in the reference space
        // Use the renderer's reference space if available; fall back to session's base reference
        const referenceSpace =
          gl.xr.getReferenceSpace?.() ||
          frame.session.requestReferenceSpace?.("local");

        const pose = frame.getPose(
          inputSource.targetRaySpace,
          referenceSpace || null
        );

        if (!pose) {
          console.warn("Could not get input pose from controller");
          return;
        }

        // Convert pose to THREE objects
        const origin = new THREE.Vector3(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        );
        const orientation = new THREE.Quaternion(
          pose.transform.orientation.x,
          pose.transform.orientation.y,
          pose.transform.orientation.z,
          pose.transform.orientation.w
        );

        // Controller forward vector (-Z) in world space
        const forward = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(orientation)
          .normalize();

        // Raycast against the floor mesh
        raycaster.current.set(origin, forward);
        const floor = floorRef.current;
        if (!floor) {
          console.warn("Floor mesh not available for raycast");
          return;
        }

        const intersects = raycaster.current.intersectObject(floor);
        console.log("Raycast intersects:", intersects.length);

        if (intersects.length > 0) {
          const point = intersects[0].point;
          const newModel = {
            id: Date.now(),
            position: [point.x, point.y, point.z],
          };
          console.log("Placing model at floor hit:", newModel.position);
          setPlacedModels((prev) => [...prev, newModel]);
        } else {
          // As a fallback, place a bit ahead of controller if no floor hit
          const fallbackPos = origin
            .clone()
            .add(forward.clone().multiplyScalar(1.5));
          const newModel = {
            id: Date.now(),
            position: [
              fallbackPos.x,
              Math.max(fallbackPos.y - 0.5, 0),
              fallbackPos.z,
            ],
          };
          console.log("Fallback placing model at:", newModel.position);
          setPlacedModels((prev) => [...prev, newModel]);
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
      {/* Visual floor grid for debugging (faint) and a transparent plane for raycasting */}
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color="#888" transparent opacity={0.12} />
      </mesh>
      <gridHelper args={[100, 50, "#444", "#222"]} position={[0, 0.001, 0]} />

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
    </>
  );
}
