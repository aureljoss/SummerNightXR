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

  // Log XR session state for debugging (shows up in DevTools)
  useEffect(() => {
    console.log(
      "XR state changed: isPresenting=",
      isPresenting,
      " session=",
      session
    );
  }, [isPresenting, session]);
  // Floor mesh reference and raycaster for fallback placement
  const floorRef = useRef();
  const raycaster = useRef(new THREE.Raycaster());

  // Handle XR select (click) events with controller-based raycasting to floor
  useEffect(() => {
    if (!session) return;

    const handleSelect = async (event) => {
      console.log("Select event fired (XR)");

      try {
        // First try: get controller transform from three.js XR controllers (safer with polyfill)
        let origin = null;
        let orientation = null;

        // Try to find a controller with a real world transform
        for (let i = 0; i < 2; i++) {
          const controller = gl.xr.getController(i);
          if (controller && controller.matrixWorld) {
            const pos = new THREE.Vector3();
            const quat = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            controller.matrixWorld.decompose(pos, quat, scale);
            // Choose controller if it has a non-zero position (user is presenting)
            if (pos.length() > 0.0001) {
              origin = pos;
              orientation = quat;
              console.log("Using controller", i, "pos", pos.toArray());
              break;
            }
          }
        }

        // Fallback: try using XRFrame.getPose if controller matrix isn't available
        if (!origin) {
          const frame = gl.xr.getFrame?.();
          if (frame && event.inputSource) {
            try {
              const pose = frame.getPose(
                event.inputSource.targetRaySpace,
                frame.session.renderState?.baseLayer?.space || null
              );
              if (pose) {
                origin = new THREE.Vector3(
                  pose.transform.position.x,
                  pose.transform.position.y,
                  pose.transform.position.z
                );
                orientation = new THREE.Quaternion(
                  pose.transform.orientation.x,
                  pose.transform.orientation.y,
                  pose.transform.orientation.z,
                  pose.transform.orientation.w
                );
                console.log("Using frame pose as fallback", origin.toArray());
              }
            } catch (e) {
              console.warn(
                "frame.getPose failed (polyfill) - will fallback to controllers if available",
                e
              );
            }
          }
        }

        if (!origin || !orientation) {
          console.warn(
            "Could not obtain controller pose from controllers or frame"
          );
          return;
        }

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
      <mesh geometry={nodes.baked.geometry} position={[0, 0.4, 0]}>
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
