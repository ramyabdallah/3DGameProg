export default class AudioManager {
  private baseAmbienceAudio?: HTMLAudioElement;
  private artifactEscalationAudio?: HTMLAudioElement;
  private creatureChaseAudio?: HTMLAudioElement;
  private mawRoarAudio?: HTMLAudioElement;
  private mawLowRoarAudio?: HTMLAudioElement;
  private mawRoarInterval?: number;
  private mawLowRoarPlayed = false;
  private doorAudio?: HTMLAudioElement;
  private artifactPickupAudio?: HTMLAudioElement;
  private buttonClickAudio?: HTMLAudioElement;
  private menuMusicAudio?: HTMLAudioElement;

  setup(): void {
    this.baseAmbienceAudio = new Audio("/assets/audio/base_music.mp3");
    this.baseAmbienceAudio.volume = 0.35;
    this.baseAmbienceAudio.loop = true;

    this.artifactEscalationAudio = new Audio("/assets/audio/escalation_music.mp3");
    this.artifactEscalationAudio.volume = 0.8;
    this.artifactEscalationAudio.loop = false;

    this.creatureChaseAudio = new Audio("/assets/audio/chase_music.mp3");
    this.creatureChaseAudio.volume = 0.8;
    this.creatureChaseAudio.loop = true;

    this.mawRoarAudio = new Audio("/assets/audio/chase_roar.mp3");
    this.mawRoarAudio.volume = 1.0;

    this.mawLowRoarAudio = new Audio("/assets/audio/low_roar.mp3");
    this.mawLowRoarAudio.volume = 1.0;

    this.doorAudio = new Audio("/assets/audio/door.mp3");
    this.doorAudio.volume = 0.7;

    this.artifactPickupAudio = new Audio("/assets/audio/artifact_pickup.mp3");
    this.artifactPickupAudio.volume = 0.8;

    this.buttonClickAudio = new Audio("/assets/audio/button_click.mp3");
    this.buttonClickAudio.volume = 0.5;

    this.menuMusicAudio = new Audio("/assets/audio/main_menu_music.mp3");
    this.menuMusicAudio.volume = 0.5;
    this.menuMusicAudio.loop = true;
  }

  playBaseAmbience(): void {
    if (!this.baseAmbienceAudio) return;
    void this.baseAmbienceAudio.play();
  }

  stopBaseAmbience(): void {
    this.baseAmbienceAudio?.pause();
    if (this.baseAmbienceAudio) this.baseAmbienceAudio.currentTime = 0;
  }

  playArtifactEscalation(): void {
    if (!this.artifactEscalationAudio) return;
    this.artifactEscalationAudio.currentTime = 0;
    this.artifactEscalationAudio.loop = true;
    void this.artifactEscalationAudio.play();
  }

  stopArtifactEscalation(): void {
    this.artifactEscalationAudio?.pause();
    if (this.artifactEscalationAudio) this.artifactEscalationAudio.currentTime = 0;
  }

  playCreatureChaseMusic(): void {
    this.stopBaseAmbience();
    this.stopArtifactEscalation();

    if (this.creatureChaseAudio) {
      this.creatureChaseAudio.currentTime = 0;
      this.creatureChaseAudio.loop = true;
      void this.creatureChaseAudio.play();
    }
  }

  stopAllMusic(): void {
    this.baseAmbienceAudio?.pause();
    this.artifactEscalationAudio?.pause();
    this.creatureChaseAudio?.pause();

    if (this.baseAmbienceAudio) this.baseAmbienceAudio.currentTime = 0;
    if (this.artifactEscalationAudio) this.artifactEscalationAudio.currentTime = 0;
    if (this.creatureChaseAudio) this.creatureChaseAudio.currentTime = 0;
  }

  playMawRoar(): void {
    if (!this.mawRoarAudio) return;
    this.mawRoarAudio.currentTime = 0;
    void this.mawRoarAudio.play();
  }

  playMawLowRoar(): void {
    if (!this.mawLowRoarAudio || this.mawLowRoarPlayed) return;
    this.mawLowRoarPlayed = true;
    this.mawLowRoarAudio.currentTime = 0;
    void this.mawLowRoarAudio.play();
  }

  startMawRoarLoop(intervalMs = 12000): void {
    this.stopMawRoarLoop();
    this.playMawRoar();
    this.mawRoarInterval = window.setInterval(() => {
      this.playMawRoar();
    }, intervalMs);
  }

  stopMawRoarLoop(): void {
    if (this.mawRoarInterval) {
      clearInterval(this.mawRoarInterval);
      this.mawRoarInterval = undefined;
    }
  }

  stopMawSounds(): void {
    this.stopMawRoarLoop();

    this.mawRoarAudio?.pause();
    if (this.mawRoarAudio) this.mawRoarAudio.currentTime = 0;

    this.mawLowRoarAudio?.pause();
    if (this.mawLowRoarAudio) this.mawLowRoarAudio.currentTime = 0;
  }

  playFinalMawRoar(): void {
    this.stopMawRoarLoop();
    this.playMawRoar();

    window.setTimeout(() => {
      this.mawRoarAudio?.pause();
      if (this.mawRoarAudio) this.mawRoarAudio.currentTime = 0;
    }, 4000);
  }

  resetMawLowRoar(): void {
    this.mawLowRoarPlayed = false;
  }

  playDoorSound(): void {
    if (!this.doorAudio) return;

    this.doorAudio.currentTime = 0;
    void this.doorAudio.play();
  }

  playArtifactPickupSound(): void {
    if (!this.artifactPickupAudio) return;

    this.artifactPickupAudio.currentTime = 0;
    void this.artifactPickupAudio.play();
  }

  playButtonClick(): void {
    if (!this.buttonClickAudio) return;

    this.buttonClickAudio.currentTime = 0;
    void this.buttonClickAudio.play();
  }

  playMenuMusic(): void {
    if (!this.menuMusicAudio) return;
    this.menuMusicAudio.currentTime = 0;
    void this.menuMusicAudio.play();
  }

  stopMenuMusic(): void {
    this.menuMusicAudio?.pause();

    if (this.menuMusicAudio) {
      this.menuMusicAudio.currentTime = 0;
    }
  }
}
