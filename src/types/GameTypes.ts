import { 
  AbstractMesh, 
  AnimationGroup 
} from "@babylonjs/core";

export type DoorData = {
  meshName: string;
  animationGroups: AnimationGroup[];
  isOpen: boolean;
  isAnimating: boolean;
};

export type ArtifactData = {
  id: string;
  meshes: AbstractMesh[];
  collected: boolean;
};
