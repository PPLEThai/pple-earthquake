// กำหนดค่าเริ่มต้นของแผนที่
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=DMl4AxokgMPvgzLikrFx',
    center: [100.5018, 13.7563],
    zoom: 6
});

// เก็บข้อมูล markers และข้อมูลทั้งหมด
let markers = [];
let allLocations = [];
let currentPage = 1;
const itemsPerPage = 20;
let selectedLocationId = null;

// ฟังก์ชันสำหรับแปลงวันที่
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ฟังก์ชันสำหรับสร้าง marker และ popup
function createMarker(location) {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundColor = '#ff6a13';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.border = '2px solid white';
    el.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)';

    const popup = new maplibregl.Popup({ offset: 25 })
        .setHTML(`
            <strong>${location.location_name}</strong><br>
            ${location.description || 'ไม่มีรายละเอียด'}<br>
            <small>${formatDate(location.date)}</small>
        `);

    const marker = new maplibregl.Marker(el)
        .setLngLat([location.longitude, location.latitude])
        .setPopup(popup)
        .addTo(map);

    marker.getElement().addEventListener('click', () => {
        map.flyTo({
            center: [location.longitude, location.latitude],
            zoom: 13
        });
        marker.togglePopup();
        highlightLocation(location);
    });

    return marker;
}

// ฟังก์ชันสำหรับไฮไลท์รายการที่เลือก
function highlightLocation(location) {
    // ลบไฮไลท์เก่า
    const previousSelected = document.querySelector('.location-item.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }

    // หาและไฮไลท์รายการใหม่
    const locationItems = document.querySelectorAll('.location-item');
    locationItems.forEach(item => {
        const itemLocation = item.dataset.location;
        if (itemLocation === JSON.stringify(location)) {
            item.classList.add('selected');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}

// ฟังก์ชันสำหรับสร้างรายการในลิสต์
function createLocationItem(location) {
    const div = document.createElement('div');
    div.className = 'location-item';
    div.dataset.location = JSON.stringify(location);
    
    let imageHtml = '';
    if (location.images && location.images.length > 0) {
        imageHtml = `
            <div class="image-container">
                <img src="https://img.pplethai.org/unsafe/rs:fit:1000:1000:1/plain/${encodeURIComponent(location.images[0])}" alt="${location.location_name}" loading="lazy">
            </div>
        `;
    } else {
        imageHtml = `
            <div class="image-container">
                <img src="images/logo-pp.png" alt="ไม่มีรูปภาพ" loading="lazy">
            </div>
        `;
    }
    
    div.innerHTML = `
        ${imageHtml}
        <div class="content">
            <h3>${location.location_name}</h3>
            <p>${location.description || 'ไม่มีรายละเอียด'}</p>
            <p class="date">${formatDate(location.date)}</p>
            <p class="full-name">${location.full_name}</p>
        </div>
    `;
    
    div.addEventListener('click', () => {
        map.flyTo({
            center: [location.longitude, location.latitude],
            zoom: 13
        });
        markers.find(m => 
            m.getLngLat().lng === location.longitude && 
            m.getLngLat().lat === location.latitude
        ).togglePopup();
        highlightLocation(location);
    });
    
    return div;
}

// ฟังก์ชันสำหรับแสดงรายการ
function displayLocations() {
    const startIndex = 0;
    const endIndex = currentPage * itemsPerPage;
    const locationsToShow = allLocations.slice(startIndex, endIndex);
    
    // ล้างรายการเก่า
    document.getElementById('location-list').innerHTML = '';
    
    // แสดงรายการใหม่
    locationsToShow.forEach(location => {
        const locationItem = createLocationItem(location);
        document.getElementById('location-list').appendChild(locationItem);
    });
    
    // ปรับสถานะปุ่ม "ดูเพิ่มเติม"
    const loadMoreBtn = document.getElementById('load-more');
    loadMoreBtn.disabled = endIndex >= allLocations.length;
}

// ฟังก์ชันสำหรับโหลดข้อมูลเพิ่มเติม
function loadMore() {
    currentPage++;
    displayLocations();
}

// ฟังก์ชันสำหรับโหลดข้อมูลจาก API
async function fetchData() {
    try {
        const response = await fetch('https://hackcity.pplethai.org/api/kaitom-fieldwork?tag=%E0%B8%9C%E0%B8%A5%E0%B8%81%E0%B8%A3%E0%B8%B0%E0%B8%97%E0%B8%9A%E0%B8%88%E0%B8%B2%E0%B8%81%E0%B9%81%E0%B8%9C%E0%B9%88%E0%B8%99%E0%B8%94%E0%B8%B4%E0%B8%99%E0%B9%84%E0%B8%AB%E0%B8%A7');
        const data = await response.json();
        
        // ล้าง markers เก่า
        markers.forEach(marker => marker.remove());
        markers = [];
        
        // เก็บข้อมูลทั้งหมด
        allLocations = data.data;
        console.log(allLocations);
        
        // สร้าง markers ทั้งหมด
        allLocations.forEach(location => {
            const marker = createMarker(location);
            markers.push(marker);
        });
        
        // แสดงรายการแรก
        displayLocations();
        
        // ปรับขอบเขตแผนที่ให้แสดงทุก marker
        if (markers.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            markers.forEach(marker => {
                bounds.extend(marker.getLngLat());
            });
            map.fitBounds(bounds, { padding: 50 });
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('location-list').innerHTML = 
            '<p style="color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// เพิ่ม event listener สำหรับปุ่ม "ดูเพิ่มเติม"
document.getElementById('load-more').addEventListener('click', loadMore);

// เริ่มโหลดข้อมูล
fetchData();