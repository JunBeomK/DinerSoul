// 주소 문자열을 좌표로 변환해주는 객체 (services 라이브러리 필요)
const geocoder = new kakao.maps.services.Geocoder();

const locationInput = document.getElementById("location-input");
const locationDropdown = document.getElementById("location-dropdown");

// 최근 검색 지역을 브라우저에 저장해두는 localStorage 키
const RECENT_SEARCH_KEY = "my-food-finder:recent-locations";
const MAX_RECENT = 5;

document
  .getElementById("btn-location-search")
  .addEventListener("click", searchByLocationName);
locationInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchByLocationName();
});

// 검색창에 포커스하면 드롭다운(최근 검색, 내 위치 버튼) 열기
locationInput.addEventListener("focus", () => {
  renderRecentSearches();
  locationDropdown.classList.remove("hidden");
});

// 검색창/드롭다운 바깥을 클릭하면 드롭다운 닫기
document.addEventListener("click", (e) => {
  if (!e.target.closest(".location-search")) {
    locationDropdown.classList.add("hidden");
  }
});

// "현재 위치로 검색" 버튼: map.js의 useMyLocation()을 그대로 재사용
document.getElementById("btn-use-my-location").addEventListener("click", () => {
  locationDropdown.classList.add("hidden");
  locationInput.value = "";
  useMyLocation();
});

function searchByLocationName() {
  const keyword = locationInput.value.trim();
  if (!keyword) return;

  locationDropdown.classList.add("hidden");
  showLoading();

  // 1차 시도: 행정구역/도로명 주소로 검색 (예: "경상북도 안동시", "안동시 옥동")
  geocoder.addressSearch(keyword, (result, status) => {
    if (status === kakao.maps.services.Status.OK && result.length > 0) {
      hideLoading();
      addRecentSearch(keyword);
      moveToLocation(result[0].y, result[0].x);
      return;
    }

    // 2차 시도: 주소로 못 찾으면 장소명(키워드)으로 검색 (예: "강남역", "홍대입구")
    places.keywordSearch(keyword, (result2, status2) => {
      hideLoading();
      if (status2 === kakao.maps.services.Status.OK && result2.length > 0) {
        addRecentSearch(keyword);
        moveToLocation(result2[0].y, result2[0].x);
      } else {
        alert("해당 위치를 찾을 수 없어요. 다른 이름으로 시도해보세요.");
      }
    });
  });
}

function moveToLocation(lat, lng) {
  const newLocation = new kakao.maps.LatLng(lat, lng);
  currentLocation = newLocation; // 이후 카테고리 검색은 이 위치를 기준으로 동작
  map.setCenter(newLocation);

  // 이전 검색 결과(핀, 리스트, 상세정보)는 새 위치와 무관하니 정리
  clearMarkers();
  document.getElementById("place-list").innerHTML = "";
  document.getElementById("place-detail").classList.add("hidden");
  document.getElementById("btn-research-area").classList.add("hidden");

  // 검색한 위치를 표시 (내 위치 점과는 다른 색의 작은 마커로 구분)
  const locationOverlay = new kakao.maps.CustomOverlay({
    position: newLocation,
    content: '<div class="searched-location-marker"></div>',
    map: map,
  });
  markers.push(locationOverlay); // CustomOverlay도 setMap(null)을 지원해서 clearMarkers()로 함께 정리됨
}

// ---- 최근 검색 지역 저장/표시 ----

function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_SEARCH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function addRecentSearch(keyword) {
  let list = getRecentSearches().filter((item) => item !== keyword);
  list.unshift(keyword);
  list = list.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(list));
}

function renderRecentSearches() {
  const list = getRecentSearches();
  const container = document.getElementById("recent-searches-list");

  if (list.length === 0) {
    container.innerHTML = '<p class="no-recent">최근 검색 기록이 없어요</p>';
    return;
  }

  container.innerHTML = list
    .map((keyword) => `<span class="recent-search-chip">${keyword}</span>`)
    .join("");

  container.querySelectorAll(".recent-search-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      locationInput.value = chip.textContent;
      locationDropdown.classList.add("hidden");
      searchByLocationName();
    });
  });
}
