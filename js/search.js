// 카카오 장소 검색 서비스 객체 (SDK 스크립트에 &libraries=services 가 있어야 사용 가능)
const places = new kakao.maps.services.Places();

// 화면에 표시 중인 마커를 기억해두는 배열 (재검색할 때 이전 마커를 지우기 위함)
let markers = [];

// 카카오 로컬 API의 카테고리 코드
const CATEGORY_CODE = {
  restaurant: "FD6", // 음식점
  cafe: "CE7", // 카페
  convenience: "CS2", // 편의점
};

// 지도 위의 기존 마커를 전부 제거
function clearMarkers() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];
}

// 로딩 표시 켜기/끄기 (location-search.js에서도 재사용)
function showLoading() {
  document.getElementById("loading-indicator").classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loading-indicator").classList.add("hidden");
}

// 장소 하나를 클릭했을 때 지도 아래 상세정보 패널을 채워서 보여줌
// (지도 위에 겹쳐 뜨는 InfoWindow 대신 별도 패널을 써서 다른 마커를 가리지 않도록 함)
function showPlaceInfo(place, position) {
  const detailBody = document.getElementById("place-detail-body");
  detailBody.innerHTML = `
    <strong>${place.place_name}</strong>
    <p>${place.category_name || ""}</p>
    <p>${place.road_address_name || place.address_name}</p>
    <p>${place.phone || "전화번호 정보 없음"}</p>
    <a href="${place.place_url}" target="_blank" rel="noopener">카카오맵에서 평점·메뉴 보기 →</a>
  `;

  document.getElementById("place-detail").classList.remove("hidden");
}

// 장소를 "선택"할 때 공통으로 하는 일: 상세정보 표시 + 리스트 카드 강조 + 마커 강조
function selectPlace(place, position, listItem, markerEl) {
  document.querySelectorAll("#place-list li.selected").forEach((li) => {
    li.classList.remove("selected");
  });
  document.querySelectorAll(".place-marker.selected").forEach((el) => {
    el.classList.remove("selected");
  });

  if (listItem) {
    listItem.classList.add("selected");
    listItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (markerEl) {
    markerEl.classList.add("selected");
  }

  showPlaceInfo(place, position);
}

document.getElementById("btn-close-detail").addEventListener("click", () => {
  document.getElementById("place-detail").classList.add("hidden");
});

// 지도 위에 표시할 검색 반경 원 (반경을 바꾸거나 재검색할 때마다 다시 그림)
let searchRadiusCircle = null;

function updateRadiusCircle(center, radius) {
  if (searchRadiusCircle) {
    searchRadiusCircle.setMap(null);
  }

  searchRadiusCircle = new kakao.maps.Circle({
    center: center,
    radius: radius,
    strokeWeight: 1,
    strokeColor: "#4285f4",
    strokeOpacity: 0.6,
    strokeStyle: "dashed",
    fillColor: "#4285f4",
    fillOpacity: 0.08,
  });
  searchRadiusCircle.setMap(map);
}

// 장소 검색 실행
// categoryCode가 있으면 카테고리 검색, 없으면 keyword로 키워드 검색
let lastCategorySearch = null;

function searchPlaces({ categoryCode, keyword, categoryGroupCode }) {
  lastCategorySearch = { categoryCode, keyword, categoryGroupCode }; // 반경 변경 시 같은 조건으로 재검색하기 위해 기억
  clearMarkers();
  document.getElementById("place-list").innerHTML = "";
  document.getElementById("place-detail").classList.add("hidden");
  document.getElementById("btn-research-area").classList.add("hidden");
  showLoading();

  const radius = Number(document.getElementById("radius-select").value);
  updateRadiusCircle(currentLocation, radius);

  const searchOption = {
    location: currentLocation, // map.js에서 관리하는 현재 위치
    radius: radius, // 검색 반경(m), 드롭다운에서 선택한 값
    sort: kakao.maps.services.SortBy.DISTANCE,
    size: 15, // 한 페이지에 가져올 최대 개수 (카카오 API 기본값이자 최댓값)
  };

  // 키워드 검색을 특정 카테고리 안에서만 하고 싶을 때 사용
  // (예: "디저트"를 카페 카테고리 안에서만 검색해서 음식점/술집이 섞이지 않게)
  if (categoryGroupCode) {
    searchOption.category_group_code = categoryGroupCode;
  }

  if (categoryCode) {
    places.categorySearch(categoryCode, handleSearchResult, searchOption);
  } else {
    places.keywordSearch(keyword, handleSearchResult, searchOption);
  }
}

// 반경을 바꾸면 마지막으로 했던 카테고리 검색을 같은 조건으로 다시 실행
document.getElementById("radius-select").addEventListener("change", () => {
  if (lastCategorySearch) {
    searchPlaces(lastCategorySearch);
  }
});

// "이 지역 재검색" 버튼: 지금 지도가 보여주고 있는 중심 위치를 기준으로 다시 검색
document.getElementById("btn-research-area").addEventListener("click", () => {
  currentLocation = map.getCenter(); // 검색 기준 위치를 지도 중심으로 갱신
  if (lastCategorySearch) {
    searchPlaces(lastCategorySearch);
  }
});

// 검색 결과 콜백: 지도에 마커 찍고 리스트에도 추가
// pagination: 카카오 API가 결과가 15개를 넘을 때 넘겨주는 페이지 정보 객체
function handleSearchResult(result, status, pagination) {
  if (status !== kakao.maps.services.Status.OK) {
    hideLoading();
    if (!pagination || pagination.current === 1) {
      alert("주변에서 결과를 찾지 못했어요. 다른 카테고리를 눌러보세요.");
    }
    return;
  }

  result.forEach((place) => {
    const position = new kakao.maps.LatLng(place.y, place.x);

    // 기본 마커 대신 div로 만든 커스텀 마커 사용 (선택 시 CSS로 크기/색 변경 가능)
    const markerEl = document.createElement("div");
    markerEl.className = "place-marker";

    const overlay = new kakao.maps.CustomOverlay({
      position,
      content: markerEl,
      map,
      yAnchor: 0.5,
      xAnchor: 0.5,
    });
    markers.push(overlay);

    const listItem = addPlaceToList(place, position, markerEl);

    // 마커를 클릭하면 정보창이 뜨고 리스트의 해당 카드도 강조되도록 연결
    markerEl.addEventListener("click", () => {
      selectPlace(place, position, listItem, markerEl);
    });
  });

  // 결과가 15개를 넘어 다음 페이지가 더 있으면 이어서 가져옴 (최대 3페이지 = 최대 45개)
  if (pagination && pagination.hasNextPage && pagination.current < 3) {
    pagination.nextPage();
  } else {
    hideLoading();
  }
}

// 검색 결과 한 개를 리스트(ul#place-list)에 추가
function addPlaceToList(place, position, markerEl) {
  const list = document.getElementById("place-list");
  const item = document.createElement("li");

  // place.distance는 검색 기준 위치로부터의 거리(m)가 문자열로 옵니다 (제공되는 경우에만)
  const distanceBadge = place.distance
    ? `<span class="distance">${formatDistance(place.distance)}</span>`
    : "";

  item.innerHTML = `
    <div class="place-info">
      <strong>${place.place_name}</strong>
      <span class="address">${place.road_address_name || place.address_name}</span>
    </div>
    <div class="place-side">
      ${distanceBadge}
      <button class="favorite-btn ${isFavorite(place.id) ? "active" : ""}" aria-label="즐겨찾기">${isFavorite(place.id) ? "★" : "☆"}</button>
    </div>
  `;

  // 즐겨찾기 버튼은 카드 선택과 별개로 동작해야 하므로 클릭이 카드까지 전파되지 않게 막음
  const favoriteBtn = item.querySelector(".favorite-btn");
  favoriteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(place);
    const nowFavorite = isFavorite(place.id);
    favoriteBtn.textContent = nowFavorite ? "★" : "☆";
    favoriteBtn.classList.toggle("active", nowFavorite);
  });

  // 리스트 항목을 클릭해도 마커를 클릭한 것과 동일하게 동작
  item.addEventListener("click", () => {
    selectPlace(place, position, item, markerEl);
  });

  list.appendChild(item);
  return item;
}

// 미터(m) 단위 거리를 보기 좋은 문자열로 변환 (1000m 이상이면 km로)
function formatDistance(distance) {
  const meters = Number(distance);
  if (!meters) return "";
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
}

// 카테고리 버튼들 (활성 표시 제어용)
const categoryButtons = [
  document.getElementById("btn-restaurant"),
  document.getElementById("btn-cafe"),
  document.getElementById("btn-convenience"),
  document.getElementById("btn-bar"),
  document.getElementById("btn-favorites"),
];

// 클릭된 버튼만 활성(active) 스타일로 표시하고 나머지는 해제
function setActiveButton(activeButton) {
  categoryButtons.forEach((btn) => btn.classList.remove("active"));
  activeButton.classList.add("active");
}

// 카테고리 버튼에 클릭 이벤트 연결
document.getElementById("btn-restaurant").addEventListener("click", (e) => {
  setActiveButton(e.target);
  searchPlaces({ categoryCode: CATEGORY_CODE.restaurant });
});

document.getElementById("btn-cafe").addEventListener("click", (e) => {
  setActiveButton(e.target);
  searchPlaces({ categoryCode: CATEGORY_CODE.cafe });
});

document.getElementById("btn-convenience").addEventListener("click", (e) => {
  setActiveButton(e.target);
  searchPlaces({ categoryCode: CATEGORY_CODE.convenience });
});

document.getElementById("btn-bar").addEventListener("click", (e) => {
  setActiveButton(e.target);
  // '술집'도 별도 카테고리 코드가 없어서, 음식점(FD6) 카테고리 안에서 키워드로 검색
  searchPlaces({ keyword: "술집", categoryGroupCode: "FD6" });
});
