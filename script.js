// กำหนดค่าเริ่มต้นของแผนที่
const map = new maplibregl.Map({
  container: "map",
  style:
    "https://api.maptiler.com/maps/basic-v2/style.json?key=DMl4AxokgMPvgzLikrFx",
  center: [100.5018, 13.7563],
  zoom: 6,
});

// เก็บข้อมูล markers และข้อมูลทั้งหมด
let markers = [];
let allLocations = [];
let engineerLocations = []; // เพิ่มตัวแปรเก็บข้อมูลวิศวกร
let currentPage = 1;
const itemsPerPage = 20;
let selectedLocationId = null;
let currentImageIndex = 0;
let currentImages = [];
let currentTab = "engineer";

// ฟังก์ชันสำหรับแปลงวันที่
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ฟังก์ชันสำหรับปิด popup ทั้งหมด
function closeAllPopups() {
  markers.forEach((marker) => {
    marker.getPopup().remove();
  });
}

// ฟังก์ชันสำหรับจัดการ modal gallery
function openImageGallery(images, startIndex = 0) {
  currentImages = images;
  currentImageIndex = startIndex;
  const modal = document.getElementById("image-gallery-modal");
  const modalImage = document.getElementById("modal-image");
  const imageCounter = document.getElementById("image-counter");

  modalImage.src = images[startIndex];
  imageCounter.textContent = `${startIndex + 1} / ${images.length}`;
  modal.style.display = "block";
}

function closeImageGallery() {
  const modal = document.getElementById("image-gallery-modal");
  modal.style.display = "none";
}

function showNextImage() {
  if (currentImageIndex < currentImages.length - 1) {
    currentImageIndex++;
    updateModalImage();
  }
}

function showPrevImage() {
  if (currentImageIndex > 0) {
    currentImageIndex--;
    updateModalImage();
  }
}

function updateModalImage() {
  const modalImage = document.getElementById("modal-image");
  const imageCounter = document.getElementById("image-counter");
  modalImage.src = currentImages[currentImageIndex];
  imageCounter.textContent = `${currentImageIndex + 1} / ${
    currentImages.length
  }`;
}

// เพิ่ม event listeners สำหรับ modal gallery
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("image-gallery-modal");
  const closeBtn = document.querySelector(".modal-close");
  const prevBtn = document.getElementById("prev-image");
  const nextBtn = document.getElementById("next-image");

  closeBtn.addEventListener("click", closeImageGallery);
  prevBtn.addEventListener("click", showPrevImage);
  nextBtn.addEventListener("click", showNextImage);

  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      closeImageGallery();
    }
  });
});

// ฟังก์ชันสำหรับสร้าง marker และ popup
function createMarker(location) {
  const el = document.createElement("div");
  el.className = "marker";

  // สร้างวงกลมแทน icon
  el.style.width = "20px";
  el.style.height = "20px";
  el.style.backgroundColor = "#ff6a13"; // สีส้มสำหรับข้อมูลสำรวจ
  el.style.borderRadius = "50%";
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 0 0 2px rgba(0,0,0,0.1)";

  let imageHtml = "";
  if (location.images && location.images.length > 0) {
    imageHtml = `
            <div style="margin-bottom: 10px; max-height: 200px; overflow: hidden; position: relative;">
                <img src="https://img.pplethai.org/unsafe/rs:fit:400:200:1/plain/${encodeURIComponent(
                  location.images[0]
                )}" 
                     alt="${location.location_name}" 
                     style="width: 100%; height: 200px; object-fit: cover; border-radius: 4px; cursor: pointer;"
                     class="gallery-image"
                     data-images='${JSON.stringify(location.images)}'>
                ${
                  location.images.length > 1
                    ? `
                    <div class="image-count-badge">
                        <i class="fas fa-camera"></i>
                        ${location.images.length}
                    </div>
                `
                    : ""
                }
            </div>
        `;
  }

  const popup = new maplibregl.Popup({
    offset: 25,
  }).setHTML(`
            ${imageHtml}
            <strong>${location.location_name}</strong><br>
            ${location.description || "ไม่มีรายละเอียด"}<br>
            <small>${formatDate(location.date)}</small><br>
            <small style="color: #666;">${location.full_name}</small>
        `);

  const marker = new maplibregl.Marker(el)
    .setLngLat([location.longitude, location.latitude])
    .setPopup(popup)
    .addTo(map);

  marker.getElement().addEventListener("click", () => {
    map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 13,
    });
    closeAllPopups();
    marker.setPopup(popup);
  });

  return marker;
}

// ฟังก์ชันสำหรับไฮไลท์รายการที่เลือก
function highlightLocation(location) {
  // ลบไฮไลท์เก่า
  const previousSelected = document.querySelector(".location-item.selected");
  if (previousSelected) {
    previousSelected.classList.remove("selected");
  }

  // หาและไฮไลท์รายการใหม่
  const locationItems = document.querySelectorAll(".location-item");
  locationItems.forEach((item) => {
    const itemLocation = item.dataset.location;
    if (itemLocation === JSON.stringify(location)) {
      item.classList.add("selected");
      item.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  });
}

// ฟังก์ชันสำหรับสร้างรายการในลิสต์
function createLocationItem(location) {
  const div = document.createElement("div");
  div.className = "location-item";
  div.dataset.location = JSON.stringify(location);

  let imageHtml = "";
  if (location.images && location.images.length > 0) {
    imageHtml = `
            <div class="image-container">
                <img src="https://img.pplethai.org/unsafe/rs:fit:1000:1000:1/plain/${encodeURIComponent(
                  location.images[0]
                )}" 
                     alt="${location.location_name}" 
                     class="gallery-image"
                     data-images='${JSON.stringify(location.images)}'
                     loading="lazy">
                ${
                  location.images.length > 1
                    ? `
                    <div class="image-count-badge">
                        <i class="fas fa-camera"></i>
                        ${location.images.length}
                    </div>
                `
                    : ""
                }
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
            <p>${location.description || "ไม่มีรายละเอียด"}</p>
            <p class="date">${formatDate(location.date)}</p>
            <p class="full-name">${location.full_name}</p>
        </div>
    `;

  // เพิ่ม event listener สำหรับรูปภาพ
  const galleryImage = div.querySelector(".gallery-image");
  if (galleryImage) {
    galleryImage.addEventListener("click", (e) => {
      e.stopPropagation();
      const images = JSON.parse(galleryImage.dataset.images);
      openImageGallery(images, 0);
    });
  }

  // เพิ่ม event listener สำหรับคลิกที่รายการ
  div.addEventListener("click", (e) => {
    // ถ้าคลิกที่รูปภาพ ให้ข้ามการทำงานนี้
    if (e.target.closest(".image-container")) {
      return;
    }

    map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 13,
    });
    closeAllPopups();
    const marker = markers.find(
      (m) =>
        m.getLngLat().lng === location.longitude &&
        m.getLngLat().lat === location.latitude
    );
    if (marker) {
      let imageHtml = "";
      if (location.images && location.images.length > 0) {
        imageHtml = `
                    <div style="margin-bottom: 10px; max-height: 200px; overflow: hidden; position: relative;">
                        <img src="https://img.pplethai.org/unsafe/rs:fit:400:200:1/plain/${encodeURIComponent(
                          location.images[0]
                        )}" 
                             alt="${location.location_name}" 
                             style="width: 100%; height: 200px; object-fit: cover; border-radius: 4px; cursor: pointer;"
                             class="gallery-image"
                             data-images='${JSON.stringify(location.images)}'>
                        ${
                          location.images.length > 1
                            ? `
                            <div class="image-count-badge">
                                <i class="fas fa-camera"></i>
                                ${location.images.length}
                            </div>
                        `
                            : ""
                        }
                    </div>
                `;
      }
      const popup = new maplibregl.Popup({
        offset: 25,
      }).setHTML(`
                    ${imageHtml}
                    <strong>${location.location_name}</strong><br>
                    ${location.description || "ไม่มีรายละเอียด"}<br>
                    <small>${formatDate(location.date)}</small><br>
                    <small style="color: #666;">${location.full_name}</small>
                `);
      marker.setPopup(popup);
    }
    highlightLocation(location);
  });

  return div;
}

// ฟังก์ชันสำหรับสร้างรายการในลิสต์สำหรับข้อมูลวิศวกร
function createEngineerItem(location) {
  const div = document.createElement("div");
  div.className = "location-item";
  div.dataset.location = JSON.stringify(location);

  // กำหนดสีและ emoji ตามสถานะ
  let statusColor, statusEmoji;
  switch (location.status) {
    case "รอนัดหมาย":
      statusColor = "#95a5a6"; // สีเทา
      statusEmoji = "⏳";
      break;
    case "นัดหมายแล้ว":
      statusColor = "#f1c40f"; // สีเหลือง
      statusEmoji = "📅";
      break;
    case "สำรวจแล้ว":
      statusColor = "#3498db"; // สีฟ้า
      statusEmoji = "✅";
      break;
    default:
      statusColor = "#95a5a6"; // สีเทา
      statusEmoji = "❓";
  }

  div.innerHTML = `
        <div class="content">
            <h3>${location.locationName}</h3>
            <p class="status" style="color: ${statusColor}; font-weight: bold;">
                ${statusEmoji} ${location.status}
            </p>
        </div>
    `;

  div.addEventListener("click", () => {
    map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 13,
    });
    closeAllPopups();
    const marker = markers.find(
      (m) =>
        m.getLngLat().lng === location.longitude &&
        m.getLngLat().lat === location.latitude
    );
    if (marker) {
      const popup = new maplibregl.Popup({
        offset: 25,
      }).setHTML(`
                    <strong>${location.locationName}</strong><br>
                    <small style="color: ${statusColor}; font-weight: bold;">
                        ${statusEmoji} สถานะ: ${location.status}
                    </small>
                `);
      marker.setPopup(popup);
    }
    highlightLocation(location);
  });

  return div;
}

// ฟังก์ชันสำหรับสร้าง marker และ popup สำหรับข้อมูลวิศวกร
function createEngineerMarker(location) {
  // กำหนดสีตามสถานะ
  let markerColor;
  switch (location.status) {
    case "รอนัดหมาย":
      markerColor = "#95a5a6"; // สีเทา
      break;
    case "นัดหมายแล้ว":
      markerColor = "#f1c40f"; // สีเหลือง
      break;
    case "สำรวจแล้ว":
      markerColor = "#3498db"; // สีฟ้า
      break;
    default:
      markerColor = "#95a5a6"; // สีเทา
  }

  // กำหนด emoji ตามสถานะ
  let statusEmoji;
  switch (location.status) {
    case "รอนัดหมาย":
      statusEmoji = "⏳";
      break;
    case "นัดหมายแล้ว":
      statusEmoji = "📅";
      break;
    case "สำรวจแล้ว":
      statusEmoji = "✅";
      break;
    default:
      statusEmoji = "❓";
  }

  // สร้างจุดบนแผนที่
  const point = {
    type: "Feature",
    properties: {
      color: markerColor,
      location: location,
      statusEmoji: statusEmoji,
      status: location.status,
    },
    geometry: {
      type: "Point",
      coordinates: [location.longitude, location.latitude],
    },
  };

  return point;
}

// ฟังก์ชันสำหรับแสดงรายการ
function displayLocations() {
  const startIndex = 0;
  const endIndex = currentPage * itemsPerPage;
  const locationsToShow =
    currentTab === "survey"
      ? allLocations.slice(startIndex, endIndex)
      : engineerLocations.slice(startIndex, endIndex);

  // อัพเดทจำนวนเหตุการณ์ทั้งหมดในส่วนหัว
  const listHeader = document.querySelector(".list-header");
  listHeader.querySelector(".tab-container").innerHTML = `
        <button class="tab-button ${
          currentTab === "engineer" ? "active" : ""
        }" data-tab="engineer">แจ้งตรวจโครงสร้าง (${
    engineerLocations.length
  } รายการ)</button>
        <button class="tab-button ${
          currentTab === "survey" ? "active" : ""
        }" data-tab="survey">แจ้งเรื่องอื่น ๆ (${
    allLocations.length
  } รายการ)</button>
    `;

  // ล้างรายการเก่า
  const locationList = document.getElementById("location-list");
  locationList.innerHTML = "";

  // เพิ่มส่วนสรุปสถานะสำหรับ Engineer Items
  if (currentTab === "engineer") {
    const descriptionDiv = document.createElement("div");
    descriptionDiv.className = "description";
    descriptionDiv.innerHTML = `
            <p style="text-align: center; margin-top: 10px; font-size: 14px; color: #666;">โดยความร่วมมือระหว่าง สมาคมวิศวกรโครงสร้างแห่งประเทศไทย กับ พรรคประชาชน</p>
        `;
    locationList.appendChild(descriptionDiv);

    const statusSummary = document.createElement("div");
    statusSummary.className = "status-summary";

    // คำนวณจำนวนแต่ละสถานะ
    const waitingCount = engineerLocations.filter(
      (item) => item.status === "รอนัดหมาย"
    ).length;
    const scheduledCount = engineerLocations.filter(
      (item) => item.status === "นัดหมายแล้ว"
    ).length;
    const completedCount = engineerLocations.filter(
      (item) => item.status === "สำรวจแล้ว"
    ).length;

    statusSummary.innerHTML = `
            <div class="status-item" style="color: #95a5a6;">
                <span class="status-emoji">⏳</span>
                <span class="status-text">รอนัดหมาย</span>
                <span class="status-count">${waitingCount}</span>
            </div>
            <div class="status-item" style="color: #f1c40f;">
                <span class="status-emoji">📅</span>
                <span class="status-text">นัดหมายแล้ว</span>
                <span class="status-count">${scheduledCount}</span>
            </div>
            <div class="status-item" style="color: #3498db;">
                <span class="status-emoji">✅</span>
                <span class="status-text">สำรวจแล้ว</span>
                <span class="status-count">${completedCount}</span>
            </div>
        `;
    locationList.appendChild(statusSummary);
  }

  // แสดงรายการใหม่
  locationsToShow.forEach((location) => {
    const locationItem =
      currentTab === "survey"
        ? createLocationItem(location)
        : createEngineerItem(location);
    locationList.appendChild(locationItem);
  });

  // ปรับสถานะปุ่ม "ดูเพิ่มเติม"
  const loadMoreBtn = document.getElementById("load-more");
  const totalItems =
    currentTab === "survey" ? allLocations.length : engineerLocations.length;
  loadMoreBtn.disabled = endIndex >= totalItems;

  // อัพเดท markers ตาม tab ที่เลือก
  updateMarkers();
}

// ฟังก์ชันสำหรับอัพเดท markers ตาม tab ที่เลือก
function updateMarkers() {
  // ลบ layer เก่าออก
  if (map.getLayer("points")) {
    map.removeLayer("points");
  }
  if (map.getSource("points")) {
    map.removeSource("points");
  }

  // สร้าง layer ใหม่ตาม tab ที่เลือก
  const locations = currentTab === "survey" ? allLocations : engineerLocations;
  const points = locations.map((location) =>
    currentTab === "survey"
      ? createSurveyPoint(location)
      : createEngineerMarker(location)
  );

  // เพิ่ม source และ layer
  map.addSource("points", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: points,
    },
  });

  map.addLayer({
    id: "points",
    type: "circle",
    source: "points",
    paint: {
      "circle-radius": 7,
      "circle-color": ["get", "color"],
      "circle-stroke-width": 1,
      "circle-opacity": 0.8,
      "circle-stroke-color": "#ffffff",
    },
  });

  // เพิ่ม event listener สำหรับคลิกที่จุด
  map.on("click", "points", (e) => {
    const coordinates = e.features[0].geometry.coordinates.slice();
    const location = JSON.parse(e.features[0].properties.location);
    const properties = e.features[0].properties;
    console.log(location);

    let popupContent;
    if (currentTab === "survey") {
      const images = location.images || [];
      let imagesHtml = "";
      if (images.length > 0) {
        imagesHtml = `<img src="${images[0]}" style="max-height: 150px; margin: 5px 0;">`;
      }

      popupContent = `
                <strong>${location.location_name}</strong><br>
                ${imagesHtml}<br>
                ${location.description || "ไม่มีรายละเอียด"}<br>
                <small>${formatDate(location.date)}</small><br>
                <small style="color: #666;">${location.full_name}</small>
            `;
    } else {
      popupContent = `
                <strong>${location.locationName}</strong><br>
                <small style="color: ${properties.color}; font-weight: bold;">
                    ${properties.statusEmoji} สถานะ: ${properties.status}
                </small>
            `;
    }

    const popup = new maplibregl.Popup({
      offset: 25,
    }).setHTML(popupContent);

    // เปิด popup
    popup.setLngLat(coordinates).addTo(map);

    // ย้ายแผนที่ไปที่จุดที่คลิก
    map.flyTo({
      center: coordinates,
      zoom: 13,
    });

    // ไฮไลท์รายการที่เลือก
    if (location) {
      highlightLocation(location);
    }
  });

  // ปรับขอบเขตแผนที่ให้แสดงทุกจุด
  if (points.length > 0) {
    const bounds = new maplibregl.LngLatBounds();
    points.forEach((point) => {
      bounds.extend(point.geometry.coordinates);
    });
    map.fitBounds(bounds, {
      padding: 50,
    });
  }
}

// ฟังก์ชันสำหรับสร้างจุดสำหรับข้อมูลสำรวจ
function createSurveyPoint(location) {
  return {
    type: "Feature",
    properties: {
      color: "#ff6a13",
      location: location,
    },
    geometry: {
      type: "Point",
      coordinates: [location.longitude, location.latitude],
    },
  };
}

// ฟังก์ชันสำหรับโหลดข้อมูลเพิ่มเติม
function loadMore() {
  currentPage++;
  displayLocations();
}

// ฟังก์ชันสำหรับโหลดข้อมูลวิศวกร
async function fetchEngineerData() {
  try {
    const response = await fetch(
      "https://storage.googleapis.com/pple-media/earthquake/public.json"
    );
    const data = await response.json();

    // กรองเฉพาะรายการที่ visible เป็น true และมีค่า latitude, longitude ที่ถูกต้อง
    engineerLocations = data.filter(
      (item) =>
        item.visible &&
        !isNaN(parseFloat(item.latitude)) &&
        !isNaN(parseFloat(item.longitude)) &&
        parseFloat(item.latitude) >= -90 &&
        parseFloat(item.latitude) <= 90 &&
        parseFloat(item.longitude) >= -180 &&
        parseFloat(item.longitude) <= 180
    );

    // แสดงรายการแรก
    displayLocations();
  } catch (error) {
    console.error("Error fetching engineer data:", error);
    document.getElementById("location-list").innerHTML =
      '<p style="color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
  }
}

// ฟังก์ชันสำหรับโหลดข้อมูลจาก API
async function fetchData() {
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(
      `https://hackcity.pplethai.org/api/kaitom-fieldwork?tag=%E0%B8%9C%E0%B8%A5%E0%B8%81%E0%B8%A3%E0%B8%B0%E0%B8%97%E0%B8%9A%E0%B8%88%E0%B8%B2%E0%B8%81%E0%B9%81%E0%B8%9C%E0%B9%88%E0%B8%99%E0%B8%94%E0%B8%B4%E0%B8%99%E0%B9%84%E0%B8%AB%E0%B8%A7&_t=${timestamp}`
    );
    const data = await response.json();

    // เก็บข้อมูลทั้งหมดและเรียงตามวันที่และเวลา
    allLocations = data.data.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      if (dateA.getTime() === dateB.getTime()) {
        return data.data.indexOf(b) - data.data.indexOf(a);
      }

      return dateB.getTime() - dateA.getTime();
    });

    // แสดงรายการแรก
    displayLocations();
  } catch (error) {
    console.error("Error fetching data:", error);
    document.getElementById("location-list").innerHTML =
      '<p style="color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
  }
}

// ฟังก์ชันสำหรับโหลดข้อมูลทั้งหมด
async function fetchAllData() {
  try {
    await Promise.all([fetchData(), fetchEngineerData()]);
  } catch (error) {
    console.error("Error fetching all data:", error);
  }
}

// เพิ่ม event listener สำหรับ tab
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("tab-button")) {
    const tab = e.target.dataset.tab;
    if (tab !== currentTab) {
      currentTab = tab;
      currentPage = 1;
      displayLocations(); // แสดงข้อมูลที่มีอยู่แล้ว
    }
  }
});

function toggleList() {
  const listContainer = document.querySelector(".list-container");
  const toggleButton = document.querySelector(".toggle-list");

  listContainer.classList.toggle("collapsed");
  toggleButton.classList.toggle("collapsed");

  // ปรับขนาดแผนที่เมื่อหุบ/กางรายการ
  if (listContainer.classList.contains("collapsed")) {
    map.resize();
  } else {
    // รอให้ animation เสร็จก่อน resize
    setTimeout(() => {
      map.resize();
    }, 300);
  }
}

// เพิ่ม event listener สำหรับปุ่ม "ดูเพิ่มเติม"
document.getElementById("load-more").addEventListener("click", loadMore);

// เพิ่ม event listener สำหรับปุ่มหุบ/กางรายการ
document.querySelector(".toggle-list").addEventListener("click", function (e) {
  // ตรวจสอบว่าการคลิกเกิดจากไอคอนลูกศรหรือไม่
  console.log("toggle-list");
  e.stopPropagation();
  toggleList();
});

// เพิ่ม event listener สำหรับรูปภาพใน popup
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("gallery-image")) {
    const images = JSON.parse(e.target.dataset.images);
    openImageGallery(images, 0);
  }
});

// เริ่มโหลดข้อมูลทั้งหมด
fetchAllData();
