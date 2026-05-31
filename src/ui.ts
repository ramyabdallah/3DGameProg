import AudioManager from "./audio/AudioManager";

export default class UI {
  private oxygenFill: HTMLDivElement;
  private oxygenText: HTMLDivElement;

  private artifactCounter: HTMLDivElement;

  private endScreen: HTMLDivElement;
  private endTitle: HTMLDivElement;
  private restartButton: HTMLButtonElement;
  private quitButton: HTMLButtonElement;
  private interactionPrompt: HTMLDivElement;

  private chaseBorderTimeout?: number;
  private chaseEffectAlreadyStarted = false;

  private audio?: AudioManager;

  constructor(onRestart: () => void) {
    const container = document.createElement("div");
    container.id = "ui-container";

    container.innerHTML = `
        <div id="oxygen-wrapper">
            <div id="oxygen-label">O₂</div>
            <div id="oxygen-bar">
            <div id="oxygen-fill"></div>
            </div>
            <div id="oxygen-text">100%</div>
        </div>

        <div id="artifact-wrapper">
            <div id="artifact-icon">🏺</div>
            <div id="artifact-counter">0 / 3</div>
        </div>

        <div id="objective-wrapper">
            <div id="objective-label">OBJECTIVE</div>
            <div id="objectiveText">Collect all artifacts</div>
        </div>

        <div id="crosshair"></div>
        <div id="interaction-prompt" class="hidden">E to collect</div>

        <div id="end-screen" class="hidden">
          <div id="end-title">GAME OVER</div>

          <div id="newspaper-page" class="hidden">
            <div id="newspaper-name">THE PACIFIC HERALD</div>
            <div id="newspaper-date">June 18, 1957</div>
            <div id="newspaper-headline"></div>
            <div id="newspaper-subtitle"></div>

            <div id="newspaper-body">
              <p id="newspaper-paragraph-1"></p>
              <p id="newspaper-paragraph-2"></p>
            </div>
          </div>

          <div id="end-buttons" class="hidden">
            <button id="restart-button">Restart</button>
            <button id="quit-button">Quit</button>
          </div>
        </div>
    `;

    document.body.appendChild(container);

    this.oxygenFill = document.getElementById("oxygen-fill") as HTMLDivElement;
    this.oxygenText = document.getElementById("oxygen-text") as HTMLDivElement;
    this.artifactCounter = document.getElementById("artifact-counter") as HTMLDivElement;
    this.endScreen = document.getElementById("end-screen") as HTMLDivElement;
    this.endTitle = document.getElementById("end-title") as HTMLDivElement;
    this.restartButton = document.getElementById("restart-button") as HTMLButtonElement;
    this.quitButton = document.getElementById("quit-button") as HTMLButtonElement;  
    this.interactionPrompt = document.getElementById("interaction-prompt") as HTMLDivElement;

    this.restartButton.addEventListener("click", () => {
      this.playButtonClick();
      onRestart();
    });

    this.quitButton.addEventListener("click", () => {
      this.playButtonClick();
      window.location.reload();
    });
  }

  updateObjective(text: string, animate = false): void {
    const objective = document.getElementById("objectiveText");
    if (!objective) return;

    objective.textContent = text;

    if (animate) {
      objective.classList.remove("objectivePulse");

      void objective.offsetWidth;

      objective.classList.add("objectivePulse");
    }
  }

  updateOxygen(current: number, max: number): void {
    const percent = Math.max(0, Math.min(1, current / max));
    const displayPercent = Math.round(percent * 100);

    this.oxygenFill.style.height = `${displayPercent}%`;
    this.oxygenText.textContent = `${displayPercent}%`;

    if (displayPercent <= 25) {
      this.oxygenFill.style.background = "#ff3b3b";
    } else if (displayPercent <= 50) {
      this.oxygenFill.style.background = "#ffb347";
    } else {
      this.oxygenFill.style.background = "#4cc9f0";
    }
  }

  updateArtifacts(current: number, total: number): void {
    this.artifactCounter.textContent = `${current} / ${total}`;
  }

  showInteractionPrompt(): void {
    this.interactionPrompt.classList.remove("hidden");
  }

  hideInteractionPrompt(): void {
    this.interactionPrompt.classList.add("hidden");
  }

  showGameOver(): void {
    this.endTitle.textContent = "YOU DIED";
    this.endTitle.style.display = "block";

    this.endTitle.classList.remove(
      "endTitleFadeIn",
      "endTitleFadeOut"
    );

    // force browser reflow
    void this.endTitle.offsetWidth;

    this.endTitle.classList.add("endTitleFadeIn");
    this.endTitle.classList.remove("endTitleFadeOut");

    this.endScreen.classList.remove("hidden");

    this.showNewspaperEnding("lose");
  }

  showWin(): void {
    this.endTitle.textContent = "YOU ESCAPED";
    this.endTitle.style.display = "block";

    this.endTitle.classList.remove(
      "endTitleFadeIn",
      "endTitleFadeOut"
    );

    void this.endTitle.offsetWidth;

    this.endTitle.classList.add("endTitleFadeIn");
    this.endTitle.classList.remove("endTitleFadeOut");

    this.endScreen.classList.remove("hidden");

    this.showNewspaperEnding("win");
  }

  hideEndScreen(): void {
    const newspaper = document.getElementById("newspaper-page");
    const buttons = document.getElementById("end-buttons");

    this.endScreen.classList.add("hidden");

    this.endTitle.style.display = "block";
    this.endTitle.classList.remove("endTitleFadeOut");

    newspaper?.classList.add("hidden");
    newspaper?.classList.remove("newspaperAppear");

    buttons?.classList.add("hidden");
    buttons?.classList.remove("newspaperButtonsAppear");
  }

  showEscapeObjective(): void {
    this.updateObjective("Escape the building", true);
  }


  setChaseEffect(active: boolean): void {
    let border = document.getElementById("chaseBorder");
    let text = document.getElementById("chaseText");

    if (!border) {
      border = document.createElement("div");
      border.id = "chaseBorder";
      document.body.appendChild(border);
    }

    if (!text) {
      text = document.createElement("div");
      text.id = "chaseText";
      text.innerText = "YOU'RE BEING CHASED!!";
      document.body.appendChild(text);
    }

    if (active) {
      text.style.display = "block";

      if (!this.chaseEffectAlreadyStarted) {
        this.chaseEffectAlreadyStarted = true;

        border.style.display = "block";

        this.chaseBorderTimeout = window.setTimeout(() => {
          border!.style.display = "none";
        }, 5000);
      }

      return;
    }

    // Reset everything when chase ends / player dies / restart / win
    border.style.display = "none";
    text.style.display = "none";
    this.chaseEffectAlreadyStarted = false;

    if (this.chaseBorderTimeout) {
      clearTimeout(this.chaseBorderTimeout);
      this.chaseBorderTimeout = undefined;
    }
  }

  showMainMenu(
    onStart: () => void,
    onControls: () => void,
    onContext: () => void
  ): void {
    let menu = document.getElementById("mainMenu");

    if (!menu) {
      menu = document.createElement("div");
      menu.id = "mainMenu";
      menu.innerHTML = `
        <h1>THE DROWNED ARCHIVE</h1>

        <div id="mainMenuButtons">
          <button id="startGameBtn">Start Game</button>
          <button id="mainControlsBtn">Controls</button>
          <button id="contextBtn">Context</button>
        </div>

        <div id="mainMenuContent"></div>
      `;
      document.body.appendChild(menu);
    }

    menu.style.display = "flex";

    document.getElementById("startGameBtn")!.onclick = () => {
      this.playButtonClick();
      onStart();
    };

    document.getElementById("mainControlsBtn")!.onclick = () => {
      this.playButtonClick();
      onControls();
    };

    document.getElementById("contextBtn")!.onclick = () => {
      this.playButtonClick();
      onContext();
    };
  }

  hideMainMenu(): void {
    const menu = document.getElementById("mainMenu");
    if (menu) menu.style.display = "none";
  }

  showPauseMenu(
    onResume: () => void,
    onControls: () => void,
    onQuit: () => void
  ): void {
    let menu = document.getElementById("pauseMenu");

    if (!menu) {
      menu = document.createElement("div");
      menu.id = "pauseMenu";
      menu.innerHTML = `
        <h1>PAUSED</h1>

        <div id="pauseMenuButtons">
          <button id="resumeBtn">Resume</button>
          <button id="pauseControlsBtn">Controls</button>
          <button id="quitBtn">Quit</button>
        </div>

        <div id="pauseMenuContent"></div>
      `;
      document.body.appendChild(menu);
    }

    menu.style.display = "flex";

    document.getElementById("resumeBtn")!.onclick = () => {
      this.playButtonClick();
      onResume();
    };

    document.getElementById("pauseControlsBtn")!.onclick = () => {
      this.playButtonClick();
      onControls();
    };

    document.getElementById("quitBtn")!.onclick = () => {
      this.playButtonClick();
      onQuit();
    };
  }

  hidePauseMenu(): void {
    const menu = document.getElementById("pauseMenu");
    if (menu) menu.style.display = "none";
  }

  showControlsPanel(): void {
    const mainButtons = document.getElementById("mainMenuButtons");
    const mainContent = document.getElementById("mainMenuContent");
    const mainTitle = document.querySelector("#mainMenu h1") as HTMLElement;

    const pauseButtons = document.getElementById("pauseMenuButtons");
    const pauseContent = document.getElementById("pauseMenuContent");
    const pauseTitle = document.querySelector("#pauseMenu h1") as HTMLElement;

    const pauseMenuVisible =
      document.getElementById("pauseMenu")?.style.display === "flex";

    const buttons = pauseMenuVisible ? pauseButtons : mainButtons;
    const content = pauseMenuVisible ? pauseContent : mainContent;
    const title = pauseMenuVisible ? pauseTitle : mainTitle;

    if (!buttons || !content) return;

    buttons.style.display = "none";
    if (title) {
      title.style.display = "none";
    }

    content.innerHTML = `
      <div class="menuContentFade">
        <h2 class="menuSectionTitle">CONTROLS</h2>

        <div class="controlsGrid">
          <div>Move Forward</div><div>W / Z</div>
          <div>Move Backward</div><div>S</div>
          <div>Move Left</div><div>A / Q</div>
          <div>Move Right</div><div>D</div>
          <div>Sprint</div><div>SHIFT</div>
          <div>Swim Up</div><div>SPACE</div>
          <div>Swim Down</div><div>CTRL</div>
          <div>Interact / Collect</div><div>E</div>
          <div>Pause</div><div>ESC</div>
        </div>

        <button id="backFromControls" class="menuBackArrow">←</button>
      </div>
    `;

    document.getElementById("backFromControls")!.onclick = () => {
      this.playButtonClick();
      content.innerHTML = "";
      buttons.style.display = "flex";
      if (title) title.style.display = "block";
    };
  }

  showContextPanel(): void {
    const buttons = document.getElementById("mainMenuButtons");
    const content = document.getElementById("mainMenuContent");
    const title = document.querySelector("#mainMenu h1") as HTMLElement;

    if (!buttons || !content) return;

    buttons.style.display = "none";
    if (title) {
      title.style.display = "none";
    }

    content.innerHTML = `
      <div class="menuContentFade">
        <h2 class="menuSectionTitle">CONTEXT</h2>

        <p class="contextText">
          Elias Veyron — an ambitious marine archaeologist and obsessive collector
          of lost relics — receives disturbing information from a close friend
          about a forgotten structure hidden in the deepest regions of the western Pacific Ocean.
        </p>

        <p class="contextText">
          Rumored to be known as <strong>The Abyssal Archive</strong>, the abandoned
          underwater facility supposedly sank decades ago while transporting artifacts
          of unimaginable historical and financial value.
        </p>

        <p class="contextText">
          Many divers and explorers attempted to uncover its secrets.
        </p>

        <p class="contextText">
          None ever returned.
        </p>

        <p class="contextText">
          Warned to stay away, Elias instead becomes consumed by the opportunity.
          Driven by greed, curiosity, and the desire to become the first survivor
          to uncover the Archive’s treasures, he descends into the abyss alone.
        </p>

        <p class="contextText">
          But something ancient still lurks within the drowned halls.
        </p>

        <p class="contextText finalWarning">
          Something watching.<br>
          Something waiting.
        </p>

        <button id="backFromContext" class="menuBackArrow">←</button>
      </div>
    `;

    const backBtn = document.getElementById("backFromContext");

    if (backBtn) {
      backBtn.onclick = () => {
        this.playButtonClick();
        content.innerHTML = "";
        if (title) {
          title.style.display = "block";
        }
        buttons.style.display = "flex";
      };
    }
  }

  showLoadingScreen(text = "Loading..."): void {
    let loading = document.getElementById("loading-screen");

    if (!loading) {
      loading = document.createElement("div");
      loading.id = "loading-screen";

      loading.innerHTML = `
        <div id="loading-title">THE DROWNED ARCHIVE</div>
        <div id="loading-text">${text}</div>
        <div id="loading-spinner"></div>
      `;

      document.body.appendChild(loading);
    }

    const loadingText = document.getElementById("loading-text");
    if (loadingText) loadingText.textContent = text;

    loading.style.display = "flex";
    loading.style.opacity = "1";
  }

  hideLoadingScreen(): void {
    const loading = document.getElementById("loading-screen");
    if (!loading) return;

    loading.style.opacity = "0";

    window.setTimeout(() => {
      loading.style.display = "none";
    }, 700);
  }

  showIntroSequence(onComplete: () => void): void {
    let intro = document.getElementById("intro-screen");

    if (!intro) {
      intro = document.createElement("div");
      intro.id = "intro-screen";

      intro.innerHTML = `
        <div id="intro-text"></div>
        <button id="intro-skip-button">»</button>
      `;

      document.body.appendChild(intro);
    }

    const introText = document.getElementById("intro-text");
    const skipButton = document.getElementById("intro-skip-button") as HTMLButtonElement;

    if (!introText || !skipButton) return;

    const lines = [
      "Western Pacific Ocean, 1957.",
      "",
      "A forgotten archive lies beneath the waves.",
      "",
      "They said it was abandoned.",
      "They said the relics inside were worth a fortune.",
      "",
      "They also said no one ever came back.",
      "",
      "My name is Elias Veyron.",
      "And curiosity has brought me here."
    ];

    const fullText = lines.join("\n");

    const typeSound = new Audio(`${import.meta.env.BASE_URL}assets/audio/typewriter.wav`);
    typeSound.volume = 0.35;

    intro.style.display = "flex";
    intro.style.opacity = "1";
    introText.textContent = "";

    let index = 0;
    let finishedTyping = false;
    let alreadyCompleted = false;
    let currentTimeout: number | undefined;

    const finishIntro = () => {
      if (alreadyCompleted) return;

      alreadyCompleted = true;
      skipButton.style.display = "none";

      intro!.style.opacity = "0";

      window.setTimeout(() => {
        intro!.style.display = "none";
        onComplete();
      }, 1200);
    };

    const showFullText = () => {
      if (finishedTyping) {
        finishIntro();
        return;
      }

      finishedTyping = true;

      if (currentTimeout) {
        clearTimeout(currentTimeout);
        currentTimeout = undefined;
      }

      introText.textContent = fullText;
    };

    skipButton.onclick = () => {
      this.playButtonClick();
      showFullText();
    };

    const typeNextCharacter = () => {
      if (finishedTyping || alreadyCompleted) return;

      if (index < fullText.length) {
        introText.textContent += fullText[index];

        if (
          fullText[index] !== " " &&
          fullText[index] !== "\n"
        ) {
          const click = typeSound.cloneNode(true) as HTMLAudioElement;
          click.volume = 0.25;
          void click.play();
        }

        index++;

        const delay =
          fullText[index - 1] === "." ? 450 :
          fullText[index - 1] === "," ? 220 :
          fullText[index - 1] === "\n" ? 300 :
          45;

        currentTimeout = window.setTimeout(typeNextCharacter, delay);
        return;
      }

      finishedTyping = true;

      currentTimeout = window.setTimeout(() => {
        finishIntro();
      }, 1500);
    };

    currentTimeout = window.setTimeout(typeNextCharacter, 700);
  }

  setAudio(audio: AudioManager): void {
    this.audio = audio;
  }

  private playButtonClick(): void {
    this.audio?.playButtonClick();
  }

  private showNewspaperEnding(type: "win" | "lose"): void {
    const newspaper = document.getElementById("newspaper-page");
    const buttons = document.getElementById("end-buttons");

    const headline = document.getElementById("newspaper-headline");
    const subtitle = document.getElementById("newspaper-subtitle");
    const paragraph1 = document.getElementById("newspaper-paragraph-1");
    const paragraph2 = document.getElementById("newspaper-paragraph-2");

    if (!newspaper || !buttons || !headline || !subtitle || !paragraph1 || !paragraph2) return;

    newspaper.classList.add("hidden");
    buttons.classList.add("hidden");

    window.setTimeout(() => {
      this.endTitle.classList.add("endTitleFadeOut");

      window.setTimeout(() => {
        this.endTitle.style.display = "none";

        if (type === "win") {
          headline.textContent = "MARINE ARCHAEOLOGIST RETURNS WITH PRICELESS RELIC";
          subtitle.textContent = "Elias Veyron survives expedition to the rumored Drowned Archive.";
          paragraph1.textContent =
            "After days of uncertainty, marine archaeologist Elias Veyron has returned from the Western Pacific carrying what experts believe may be one of the most valuable artifacts ever recovered from the ocean floor.";
          paragraph2.textContent =
            "Officials have refused to comment on the exact location of the discovery. Veyron, visibly shaken, declined to answer questions about the fate of previous expeditions.";
        } else {
          headline.textContent = "EXPLORER VANISHES DURING ILLEGAL DEEP-SEA EXPEDITION";
          subtitle.textContent = "Search teams find no trace of Elias Veyron near the Western Pacific site.";
          paragraph1.textContent =
            "Marine archaeologist and private collector Elias Veyron has been reported missing after failing to return from an expedition into a restricted deep-sea region of the Western Pacific.";
          paragraph2.textContent =
            "Authorities suspect Veyron was searching for a rumored sunken archive linked to several previous disappearances. The search has been suspended due to dangerous conditions.";
        }

        newspaper.classList.remove("hidden");
        buttons.classList.remove("hidden");

        newspaper.classList.add("newspaperAppear");
        buttons.classList.add("newspaperButtonsAppear");
      }, 1200);
    }, 2500);
  }

  showMawDeathTransition(onBlackScreen: () => void): void {
    let deathFade = document.getElementById("maw-death-fade");

    if (!deathFade) {
      deathFade = document.createElement("div");
      deathFade.id = "maw-death-fade";
      document.body.appendChild(deathFade);
    }

    deathFade.style.display = "block";
    deathFade.style.opacity = "0";

    window.setTimeout(() => {
      deathFade!.style.opacity = "1";
    }, 30);

    window.setTimeout(() => {
      onBlackScreen();
    }, 6000);
  }
}