import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
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

  // Log XR session state for debugging (shows up in DevTools) and create overlay
  useEffect(() => {
    const msg = `XR state changed: isPresenting=${isPresenting} session=${
      session ? "yes" : "no"
    }`;
    console.log(msg, isPresenting, session);
    let overlay = document.getElementById("xr-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "xr-overlay";
      overlay.style.position = "fixed";
      overlay.style.right = "10px";
      overlay.style.top = "10px";
      overlay.style.maxWidth = "360px";
      overlay.style.zIndex = "99999";
      overlay.style.fontFamily = "monospace";
      overlay.style.fontSize = "12px";
      overlay.style.lineHeight = "1.2";
      overlay.style.color = "#0f0";
      overlay.style.background = "rgba(0,0,0,0.45)";
      overlay.style.padding = "8px";
      overlay.style.borderRadius = "6px";
      overlay.style.pointerEvents = "none";
      overlay.style.whiteSpace = "pre-wrap";
      document.body.appendChild(overlay);
    }
    overlay.innerText = msg;
  }, [isPresenting, session]);

  // helper to write to overlay + console
  const writeLog = (text) => {
    try {
      console.log(text);
      const overlay = document.getElementById("xr-overlay");
      if (overlay) {
        const now = new Date().toLocaleTimeString();
        overlay.innerText = now + " — " + text + "\n" + overlay.innerText;
        const lines = overlay.innerText.split("\n").slice(0, 12).join("\n");
        overlay.innerText = lines;
      }
    } catch (e) {
      /* ignore */
    }
  };
  // Floor mesh reference and raycaster for fallback placement
  const floorRef = useRef();
  const raycaster = useRef(new THREE.Raycaster());
  // Debug helpers: controller forward line and intersection marker
  const controllerLineRef = useRef();
  const markerRef = useRef();

  // Handle XR select (click) events with controller-based raycasting to floor
  useEffect(() => {
    if (!session) return;

    const handleSelect = async (event) => {
      writeLog("Select event fired (XR)");

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
              writeLog("Using controller " + i + " pos " + pos.toArray());
              break;
            }
          }
        }

        // Fallback: try using XRFrame.getPose if controller matrix isn't available
        if (!origin) {
          const frame = gl.xr.getFrame?.();
          if (!frame) {
            writeLog("XR frame not available (fallback)");
          }
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
                writeLog("Using frame pose as fallback " + origin.toArray());
              }
            } catch (e) {
              writeLog(
                "frame.getPose failed (polyfill) - will fallback to controllers if available: " + e
              );
            }
          }
        }

        if (!origin || !orientation) {
          writeLog("Could not obtain controller pose from controllers or frame");
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
          writeLog("Floor mesh not available for raycast");
          return;
        }

        const intersects = raycaster.current.intersectObject(floor);
        writeLog("Raycast intersects: " + intersects.length);

        if (intersects.length > 0) {
          const point = intersects[0].point;
          const newModel = {
            id: Date.now(),
            position: [point.x, point.y, point.z],
          };
          writeLog("Placing model at floor hit: " + newModel.position);
          setPlacedModels((prev) => [...prev, newModel]);
          // show marker at hit
          if (markerRef.current) {
            markerRef.current.position.copy(point);
            markerRef.current.visible = true;
          }
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
          writeLog("Fallback placing model at: " + newModel.position);
          setPlacedModels((prev) => [...prev, newModel]);
          if (markerRef.current) {
            markerRef.current.position.set(
              newModel.position[0],
              newModel.position[1],
              newModel.position[2]
            );
            markerRef.current.visible = true;
          }
        }
      } catch (err) {
        writeLog("Error during select: " + err);
      }
    };

    session.addEventListener("select", handleSelect);
    writeLog("Select listener attached");

    return () => {
      session.removeEventListener("select", handleSelect);
    };
  }, [session, gl]);

  // Update controller debug line each frame
  useFrame(() => {
    const line = controllerLineRef.current;
    if (!line) return;

    // Prefer controller 0 then 1
    const controller = gl.xr.getController(0) || gl.xr.getController(1);
    if (!controller || !controller.matrixWorld) {
      line.visible = false;
      return;
    }

    // Decompose controller world matrix
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    controller.matrixWorld.decompose(pos, quat, scale);

    const forward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(quat)
      .normalize();
    const end = pos.clone().add(forward.multiplyScalar(3));

    // Update geometry points
    const pts = [pos, end];
    line.geometry.setFromPoints(pts);
    line.visible = true;
  });

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

      {/* Controller forward line helper */}
      <line ref={controllerLineRef} visible={false}>
        <bufferGeometry />
        <lineBasicMaterial color="yellow" />
      </line>
      {/* Intersection marker (small red sphere) */}
      <mesh ref={markerRef} visible={false} position={[0, 0, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color="red" />
      </mesh>

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
