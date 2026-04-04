export function renderLanding(container: HTMLElement) {
  container.innerHTML = `
    <div class="landing">
      <h1 class="landing-title">スケール探検</h1>
      <p class="landing-subtitle">スクロールで巡る、宇宙のものさし</p>
      <div class="landing-cards">
        <a href="#history" class="landing-card landing-card--history">
          <span class="landing-card-icon">🌌</span>
          <span class="landing-card-title">宇宙史のスケール</span>
          <span class="landing-card-desc">ビッグバンから現代まで</span>
        </a>
        <a href="#length" class="landing-card landing-card--length">
          <span class="landing-card-icon">📏</span>
          <span class="landing-card-title">長さのスケール</span>
          <span class="landing-card-desc">プランク長から観測可能な宇宙まで</span>
        </a>
      </div>
    </div>
  `;
}
