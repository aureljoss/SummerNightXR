import * as THREE from "three";
import { extend, useFrame } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import { GUI } from "lil-gui";

export default function XRExperience() {
  const [red, setRed] = useState(false);
  return (
    <>
      <mesh
        pointerEventsType={{ deny: "grab" }}
        onClick={() => setRed(!red)}
        position={[0, 1, -1]}
      >
        <boxGeometry />
        <meshBasicMaterial color={red ? "red" : "blue"} />
      </mesh>
    </>
  );
}
