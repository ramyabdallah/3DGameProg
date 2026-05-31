import { 
  AbstractMesh, 
  MeshBuilder, 
  Ray, 
  Scene, 
  UniversalCamera, 
  Vector3, 
  VertexBuffer 
} from "@babylonjs/core";

export default class PlayerController {
  public keys: Record<string, boolean> = {};

  private minHeightAboveTerrain = 1.2;
  private wallCollisionDistance = 1.2;

  private worldMinX = -120;
  private worldMaxX = 120;
  private worldMinZ = -80;
  private worldMaxZ = 170;
  private worldMinY = -5;
  private worldMaxY = 120;

  private scene: Scene;
  private camera: UniversalCamera;
  private terrain: ReturnType<typeof MeshBuilder.CreateGround>;
  private collisionMeshes: AbstractMesh[];
  constructor(
    scene: Scene,
    camera: UniversalCamera,
    terrain: ReturnType<typeof MeshBuilder.CreateGround>,
    collisionMeshes: AbstractMesh[]
  ) {
    this.scene = scene;
    this.camera = camera;
    this.terrain = terrain;
    this.collisionMeshes = collisionMeshes;
  }

  setCollisionMeshes(collisionMeshes: AbstractMesh[]): void {
    this.collisionMeshes = collisionMeshes;
  }

  update(deltaTime: number): void {
    const normalSpeed = 4.0;
    const fastSpeed = 7.0;

    const isForwardPressed = this.keys["w"] || this.keys["z"];
    const isShiftPressed = this.keys["shift"];
    const speed = isShiftPressed && isForwardPressed ? fastSpeed : normalSpeed;

    let moveDirection = Vector3.Zero();

    const forward = this.camera.getDirection(Vector3.Forward());
    const right = this.camera.getDirection(Vector3.Right());
    const up = Vector3.Up();

    if (this.keys["w"] || this.keys["z"]) moveDirection = moveDirection.add(forward);
    if (this.keys["s"]) moveDirection = moveDirection.subtract(forward);
    if (this.keys["a"] || this.keys["q"]) moveDirection = moveDirection.subtract(right);
    if (this.keys["d"]) moveDirection = moveDirection.add(right);
    if (this.keys[" "]) moveDirection = moveDirection.add(up);
    if (this.keys["control"]) moveDirection = moveDirection.subtract(up);

    if (moveDirection.length() === 0) return;

    moveDirection = moveDirection.normalize();
    const nextPosition = this.camera.position.add(moveDirection.scale(speed * deltaTime));

    const terrainHeight = this.getTerrainHeightAt(nextPosition.x, nextPosition.z);
    const minimumY = terrainHeight + this.minHeightAboveTerrain;

    if (nextPosition.y < minimumY) nextPosition.y = minimumY;

    nextPosition.x = Math.max(this.worldMinX, Math.min(this.worldMaxX, nextPosition.x));
    nextPosition.y = Math.max(this.worldMinY, Math.min(this.worldMaxY, nextPosition.y));
    nextPosition.z = Math.max(this.worldMinZ, Math.min(this.worldMaxZ, nextPosition.z));

    if (!this.isBlockedByWall(this.camera.position, moveDirection)) {
      this.camera.position.copyFrom(nextPosition);
    }
  }

  getPosition(): Vector3 {
    return this.camera.position;
  }

  reset(position: Vector3): void {
    this.camera.position = position.clone();
  }

  getTerrainHeightAt(x: number, z: number): number {
    if (!this.terrain) return -999;

    const positions = this.terrain.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) return -999;

    let closestDistance = Infinity;
    let closestY = 0;

    for (let i = 0; i < positions.length; i += 3) {
      const vx = positions[i] + this.terrain.position.x;
      const vy = positions[i + 1] + this.terrain.position.y;
      const vz = positions[i + 2] + this.terrain.position.z;

      const dx = vx - x;
      const dz = vz - z;
      const dist = dx * dx + dz * dz;

      if (dist < closestDistance) {
        closestDistance = dist;
        closestY = vy;
      }
    }

    return closestY;
  }

  private isBlockedByWall(currentPosition: Vector3, moveDirection: Vector3): boolean {
    if (moveDirection.length() === 0) return false;

    const direction = moveDirection.normalize();
    const rayOrigin = currentPosition.clone();
    rayOrigin.y -= 0.4;

    const ray = new Ray(rayOrigin, direction, this.wallCollisionDistance);

    const hit = this.scene.pickWithRay(ray, (mesh) => {
      return this.collisionMeshes.includes(mesh as AbstractMesh);
    });

    return !!hit?.hit;
  }
}
