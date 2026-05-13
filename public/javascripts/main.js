/**
 * 🐾 綠色萌爪：環保貓砂價格觀測站 - 前端邏輯
 */

const form = document.getElementById('insertForm');
const message = document.getElementById('message');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const container = document.getElementById('quotesContainer');

let myChart = null; // 儲存 Chart.js 實例

// 初始化載入
document.addEventListener('DOMContentLoaded', () => {
    // 預設日期為今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('observed_at').value = today;
    
    loadQuotes();

    // 搜尋事件
    searchBtn.addEventListener('click', () => {
        searchQuotes(searchInput.value.trim());
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        loadQuotes();
    });
});

// --- 核心功能函式 ---

/**
 * 從伺服器獲取所有紀錄並排序
 */
async function loadQuotes() {
    container.innerHTML = '<p class="table-placeholder table-fadeIn">正在同步數據中...</p>';
    try {
        const res = await fetch('/api/quotes');
        if (!res.ok) throw new Error('無法獲取資料');
        const rows = await res.json();
        
        // 依照 ID 從小到大排序 (使用者要求)
        const sortedRows = [...rows].sort((a, b) => a.id - b.id);
        
        renderTable(sortedRows);
        renderChart(rows); // 圖表使用原始數據進行內部排序
    } catch (err) {
        container.innerHTML = `<p class="table-placeholder">❌ 載入失敗: ${err.message}</p>`;
    }
}

/**
 * 搜尋特定產品或品牌
 */
async function searchQuotes(query) {
    if (!query) {
        loadQuotes();
        return;
    }
    container.innerHTML = '<p class="table-placeholder table-fadeIn">正在搜尋貓砂...</p>';
    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('搜尋出錯');
        const rows = await res.json();
        
        const sortedRows = [...rows].sort((a, b) => a.id - b.id);
        renderTable(sortedRows);
        renderChart(rows);
    } catch (err) {
        container.innerHTML = `<p class="table-placeholder">❌ 搜尋失敗: ${err.message}</p>`;
    }
}

/**
 * 新增紀錄 (整合為單一按鈕，預設使用 POST)
 */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.textContent = '處理中...';
    message.style.color = '#777';

    const payload = {
        id: form.id.value || undefined,
        observed_at: form.observed_at.value,
        product_name: form.product_name.value,
        price: Number(form.price.value),
        brand: form.brand.value ? form.brand.value.trim() : undefined
    };

    try {
        const res = await fetch('/api/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const resultText = await res.text();
        
        if (res.ok) {
            message.style.color = 'var(--mint-primary)';
            message.textContent = '✨ 新增成功！資料已寫入數據庫。';
            form.reset();
            // 重設日期為今天
            document.getElementById('observed_at').value = new Date().toISOString().split('T')[0];
            loadQuotes(); // 刷新顯示
        } else {
            message.style.color = '#e74c3c';
            message.textContent = '❌ 新增失敗: ' + resultText;
        }
    } catch (err) {
        message.style.color = '#e74c3c';
        message.textContent = '❌ 連線錯誤: ' + err.message;
    }
});

// --- 渲染函式 ---

/**
 * 渲染表格
 */
function renderTable(rows) {
    if (!rows || rows.length === 0) {
        container.innerHTML = '<p class="table-placeholder">目前沒有相關紀錄 🐾</p>';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>日期</th>
                <th>產品名稱</th>
                <th>價格</th>
                <th>品牌</th>
            </tr>
        </thead>
        <tbody>
            ${rows.map(r => `
                <tr class="table-fadeIn">
                    <td><span class="id-badge">${r.id}</span></td>
                    <td>${r.observed_at || '-'}</td>
                    <td class="product-cell">${r.product_name}</td>
                    <td class="price-cell">$${r.price}</td>
                    <td>${r.brand || '-'}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.textContent = '';
    container.appendChild(table);
}

/**
 * 渲染或更新折線圖
 */
function renderChart(rows) {
    if (!rows || rows.length === 0) {
        if (myChart) myChart.destroy();
        myChart = null;
        return;
    }

    // 按日期排序以確保圖表走勢正確
    const sortedByDate = [...rows].sort((a, b) => new Date(a.observed_at) - new Date(b.observed_at));
    const labels = [...new Set(sortedByDate.map(r => r.observed_at).filter(d => d))].sort();

    // 將資料依產品分組
// 將資料依產品分組
    const products = {};
    sortedByDate.forEach(r => {
        if (!r.observed_at) return;
        
        // 👇 取得乾淨的名稱（砍掉空白）
        const cleanName = r.product_name.trim(); 
        
        // 👇 用乾淨的名稱來分組
        if (!products[cleanName]) products[cleanName] = {};
        products[cleanName][r.observed_at] = r.price;
    });

    const colors = ['#63C1A0', '#FF9F43', '#54A0FF', '#FF6B6B', '#A29BFE', '#48dbfb'];
    
    const datasets = Object.keys(products).map((pName, i) => {
        const color = colors[i % colors.length];
        return {
            label: pName,
            data: labels.map(date => products[pName][date] || null),
            borderColor: color,
            backgroundColor: color,
            borderWidth: 3,
            tension: 0.35,
            spanGaps: true,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#fff',
            pointBorderWidth: 2
        };
    });

    const ctx = document.getElementById('priceChart').getContext('2d');

    if (myChart) {
        myChart.data.labels = labels;
        myChart.data.datasets = datasets;
        myChart.update();
    } else {
        myChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { font: { family: 'Noto Sans TC', size: 12 }, usePointStyle: true } },
                    tooltip: { padding: 12, cornerRadius: 10 }
                },
                scales: {
                    y: { grid: { color: '#f0f0f0' }, ticks: { callback: v => '$' + v } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}