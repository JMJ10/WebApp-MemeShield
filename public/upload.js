// upload.js — MemeShield Analyze Page

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const analyzeBtn = document.getElementById('analyze-btn');
let selectedFile = null;

// Drag & drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dz-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dz-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dz-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelect(file);
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFileSelect(e.target.files[0]);
});

function handleFileSelect(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('File must be under 5MB.');
    return;
  }
  selectedFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('preview-img').src = e.target.result;
    document.getElementById('dz-idle').classList.add('hidden');
    document.getElementById('dz-preview').classList.remove('hidden');
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  selectedFile = null;
  fileInput.value = '';
  document.getElementById('preview-img').src = '';
  document.getElementById('dz-idle').classList.remove('hidden');
  document.getElementById('dz-preview').classList.add('hidden');
  analyzeBtn.disabled = true;
  clearResult();
}

function clearResult() {
  document.getElementById('result-panel').classList.add('hidden');
}

async function analyze() {
  if (!selectedFile) return;

  // Show spinner
  document.getElementById('btn-text').textContent = 'Analyzing…';
  document.getElementById('btn-spinner').classList.remove('hidden');
  analyzeBtn.disabled = true;

  try {
    // Step 1: Upload image
    const form = new FormData();
    form.append('image', selectedFile);
    const uploadRes = await fetch('/upload', { method: 'POST', body: form });
    const uploadData = await uploadRes.json();

    if (!uploadData.imageUrl) throw new Error('Upload failed');

    // Step 2: Analyze
    const analyzeRes = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: uploadData.imageUrl })
    });
    const result = await analyzeRes.json();

    showResult(uploadData.imageUrl, result);
  } catch (err) {
    console.error(err);
    alert('Analysis failed. Please try again.');
  } finally {
    document.getElementById('btn-text').textContent = 'Analyze Meme';
    document.getElementById('btn-spinner').classList.add('hidden');
    analyzeBtn.disabled = false;
  }
}

function showResult(imageUrl, result) {
  const label = (result.label || 'unknown').toLowerCase();
  const confidence = result.confidence ? (result.confidence * 100).toFixed(1) : null;

  // Image
  document.getElementById('result-img').src = imageUrl;

  // Verdict
  const verdictEl = document.getElementById('result-verdict');
  const isOffensive = label !== 'not_offensive';
  const labelDisplay = label.replace(/_/g, ' ');

  const colorClass = label === 'not_offensive' ? 'verdict-safe'
    : label.includes('very') || label.includes('hateful') ? 'verdict-danger'
    : 'verdict-warning';

  verdictEl.innerHTML = `
    <div class="verdict-badge ${colorClass}">
      <span class="verdict-dot"></span>
      <span class="verdict-label">${labelDisplay}</span>
      ${confidence ? `<span class="verdict-conf">${confidence}%</span>` : ''}
    </div>
    <p class="verdict-desc">${isOffensive ? '⚠️ This content has been flagged as potentially offensive.' : '✅ This content appears to be safe.'}</p>
  `;

  // Details
  const detailsEl = document.getElementById('result-details');
  let detailsHtml = '';

if (result.explanation) {
  detailsHtml += `
    <div class="detail-card">
      <div class="detail-title">📌 Explanation</div>
      <div class="detail-text">${result.explanation}</div>
    </div>`;
}

if (result.categories?.length) {
  detailsHtml += `
    <div class="detail-card">
      <div class="detail-title">🏷 Categories</div>
      <div class="tag-container">
        ${result.categories.map(c => `<span class="tag">${c}</span>`).join('')}
      </div>
    </div>`;
}

if (result.laws?.length) {
  detailsHtml += `
    <div class="detail-card">
      <div class="detail-title">⚖ Relevant Policies</div>
      <ul class="law-list">
        ${result.laws.map(l => `<li>${l}</li>`).join('')}
      </ul>
    </div>`;
}

detailsEl.innerHTML = detailsHtml;

  document.getElementById('result-panel').classList.remove('hidden');
  document.getElementById('result-panel').scrollIntoView({ behavior: 'smooth' });
}