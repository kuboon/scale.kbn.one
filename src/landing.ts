export function renderLanding(container: HTMLElement) {
  container.innerHTML = `
    <div class="landing">
      <h1 class="landing-title">スケール探検</h1>
      <p class="landing-subtitle">スクロールで巡る、宇宙のものさし</p>
      <div class="landing-cards">
        <a href="#time" class="landing-card landing-card--time">
          <span class="landing-card-icon">⏳</span>
          <span class="landing-card-title">時間のスケール</span>
          <span class="landing-card-desc">プランク時間から宇宙の年齢まで</span>
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
