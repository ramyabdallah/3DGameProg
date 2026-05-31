import { 
  AbstractMesh,
  AnimationGroup,
  Ray, 
  Scene, 
  UniversalCamera, 
  Vector3 
} from "@babylonjs/core";

import AudioManager from "../audio/AudioManager";
import { 
  MONSTER_WAYPOINT_LINKS, 
  MONSTER_WAYPOINTS 
} from "./MonsterWaypoints";

export default class MonsterController {
  private monsterStartPosition?: Vector3;
  private monsterStartRotation?: Vector3;
  private monster?: AbstractMesh;
  private monsterAnimation?: AnimationGroup;
  private monsterChaseStarted = false;
  private monsterSpeed = 5.0;
  private monsterCatchDistance = 2.2;
  private monsterPathUpdateTimer = 0;
  private monsterFloorOffset = 3.0;
  private monsterPath: number[] = [];

  private scene: Scene;
  private audio: AudioManager;
  private collisionMeshes: AbstractMesh[];
  private getTerrainHeightAt: (x: number, z: number) => number;
  private onCaught: () => void;
  constructor(
    scene: Scene,
    audio: AudioManager,
    collisionMeshes: AbstractMesh[],
    getTerrainHeightAt: (x: number, z: number) => number,
    onCaught: () => void
  ) {
    this.scene = scene;
    this.audio = audio;
    this.collisionMeshes = collisionMeshes;
    this.getTerrainHeightAt = getTerrainHeightAt;
    this.onCaught = onCaught;
  }

  setCollisionMeshes(collisionMeshes: AbstractMesh[]): void {
    this.collisionMeshes = collisionMeshes;
  }

  setup(monster: AbstractMesh | undefined, monsterAnimation?: AnimationGroup): void {
    this.monster = monster;
    this.monsterAnimation = monsterAnimation;

    if (!this.monster) return;

    const worldPosition = this.monster.getAbsolutePosition().clone();
    this.monster.setParent(null);
    this.monster.position.copyFrom(worldPosition);

    const monsterFloorY = this.getTerrainHeightAt(this.monster.position.x, this.monster.position.z) + this.monsterFloorOffset;
    this.monster.position.y = Math.max(this.monster.position.y, monsterFloorY);

    this.monsterStartPosition = this.monster.position.clone();
    this.monsterStartRotation = this.monster.rotation.clone();

    if (this.monsterAnimation) {
      this.monsterAnimation.stop();
      this.monsterAnimation.reset();
    }

    this.monster.setEnabled(false);
  }

  startChase(): void {
    if (!this.monster || this.monsterChaseStarted) return;

    this.monsterChaseStarted = true;
    this.monster.setEnabled(true);

    if (this.monsterAnimation) {
      this.monsterAnimation.stop();
      this.monsterAnimation.reset();
      this.monsterAnimation.start(true, 1.5);
    }

    this.monsterPath = [];

    this.audio.playCreatureChaseMusic();
    this.audio.startMawRoarLoop(12000);
  }

  update(deltaTime: number): void {
    if (!this.monster || !this.monsterChaseStarted) return;

    const camera = this.scene.activeCamera as UniversalCamera;
    const monsterPos = this.monster.position.clone();
    const playerDistance = Vector3.Distance(monsterPos, camera.position);

    if (playerDistance < this.monsterCatchDistance) {
      this.stopChase();
      this.audio.playFinalMawRoar();
      this.onCaught();
      return;
    }

    const directChaseDistance = 7;
    const directDirection = camera.position.subtract(monsterPos);

    if (playerDistance < directChaseDistance && directDirection.length() > 0.2) {
      const directRay = new Ray(monsterPos.add(new Vector3(0, 1, 0)), directDirection.normalize(), playerDistance);
      const directBlocked = this.scene.pickWithRay(directRay, (mesh) => this.isMonsterObstacle(mesh as AbstractMesh));

      if (!directBlocked?.hit) {
        const nextPosition = monsterPos.add(directDirection.normalize().scale(this.monsterSpeed * deltaTime));
        this.clampMonsterY(nextPosition);
        this.monster.position.copyFrom(nextPosition);
        this.monster.lookAt(camera.position.clone());
        return;
      }
    }

    this.monsterPathUpdateTimer -= deltaTime;

    if (this.monsterPath.length === 0 || this.monsterPathUpdateTimer <= 0) {
      const monsterWaypoint = this.getNearestWaypointIndex(monsterPos);
      const playerWaypoint = this.getNearestWaypointIndex(camera.position);
      this.monsterPath = this.findWaypointPath(monsterWaypoint, playerWaypoint);
      this.monsterPathUpdateTimer = 2.0;
    }

    if (this.monsterPath.length < 2) {
      this.monster.lookAt(camera.position.clone());
      return;
    }

    const nextWaypointIndex = this.monsterPath[1];
    const waypoint = MONSTER_WAYPOINTS[nextWaypointIndex];
    const targetPos = new Vector3(waypoint.x, this.monster.position.y, waypoint.z);

    const flatDistanceToWaypoint = Vector3.Distance(
      new Vector3(monsterPos.x, 0, monsterPos.z),
      new Vector3(targetPos.x, 0, targetPos.z)
    );

    if (flatDistanceToWaypoint < 0.1) {
      this.monsterPath.shift();
      return;
    }

    const toTarget = targetPos.subtract(monsterPos);
    if (toTarget.length() === 0) return;

    const moveDirection = toTarget.normalize();
    const wallCheckRay = new Ray(monsterPos.add(new Vector3(0, 1, 0)), moveDirection, 2.5);
    const blocked = this.scene.pickWithRay(wallCheckRay, (mesh) => this.isMonsterObstacle(mesh as AbstractMesh));

    if (blocked?.hit) {
      this.monsterPathUpdateTimer = 0;
      return;
    }

    const nextPosition = monsterPos.add(moveDirection.scale(this.monsterSpeed * deltaTime));

    const verticalDifference = camera.position.y - nextPosition.y;
    const maxVerticalMove = 1.5 * deltaTime;

    if (Math.abs(verticalDifference) > 0.2) {
      nextPosition.y += Math.sign(verticalDifference) * maxVerticalMove;
    }

    this.clampMonsterY(nextPosition);
    this.monster.position.copyFrom(nextPosition);
    this.monster.lookAt(targetPos);
  }

  reset(): void {
    this.stopChase();
    this.monsterAnimation?.stop();
    this.monsterAnimation?.reset();

    if (this.monster && this.monsterStartPosition) {
      this.monster.position.copyFrom(this.monsterStartPosition);

      if (this.monsterStartRotation) {
        this.monster.rotation.copyFrom(this.monsterStartRotation);
      }

      this.monster.setEnabled(false);
    }

    this.monsterPath = [];
    this.monsterPathUpdateTimer = 0;
  }

  stopChase(): void {
    this.monsterChaseStarted = false;
    this.audio.stopMawRoarLoop();
    this.monsterAnimation?.stop();
    this.monsterAnimation?.reset();
  }

  isChasing(): boolean {
    return this.monsterChaseStarted;
  }

  private clampMonsterY(position: Vector3): void {
    const floorY = this.getTerrainHeightAt(position.x, position.z) + this.monsterFloorOffset;
    const ceilingY = 120 - 2.5;
    position.y = Math.max(floorY, Math.min(ceilingY, position.y));
  }

  private isMonsterObstacle(mesh: AbstractMesh): boolean {
    if (mesh === this.monster) return false;

    const name = mesh.name.toLowerCase();
    if (name.includes("object001_books")) return false;
    if (name.includes("_books")) return false;
    if (name.includes("books_")) return false;
    if (name.includes("artifact")) return false;

    return this.collisionMeshes.includes(mesh);
  }

  private getNearestWaypointIndex(position: Vector3): number {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    MONSTER_WAYPOINTS.forEach((waypoint, index) => {
      const distance = Vector3.Distance(new Vector3(position.x, 0, position.z), new Vector3(waypoint.x, 0, waypoint.z));

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }

  private findWaypointPath(startIndex: number, goalIndex: number): number[] {
    const queue: number[][] = [[startIndex]];
    const visited = new Set<number>();

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];

      if (current === goalIndex) return path;
      if (visited.has(current)) continue;
      visited.add(current);

      MONSTER_WAYPOINT_LINKS[current].forEach((next) => {
        if (!visited.has(next)) queue.push([...path, next]);
      });
    }

    return [startIndex];
  }
}
