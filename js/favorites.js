// 즐겨찾기 저장에 사용하는 localStorage 키
const FAVORITES_KEY = "my-food-finder:favorites";

function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function isFavorite(placeId) {
  const favorites = getFavorites();
  return Boolean(favorites[placeId]);
}

// 장소를 즐겨찾기에 추가하거나, 이미 있으면 제거
function toggleFavorite(place) {
  const favorites = getFavorites();

  if (favorites[place.id]) {
    delete favorites[place.id];
  } else {
    // 나중에 목록/지도에 다시 그릴 때 필요한 정보만 저장
    favorites[place.id] = {
      id: place.id,
      place_name: place.place_name,
      category_name: place.category_name,
      address_name: place.address_name,
      road_address_name: place.road_address_name,
      phone: place.phone,
      place_url: place.place_url,
      x: place.x,
      y: place.y,
    };
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

// "즐겨찾기" 버튼 클릭 시 저장된 장소들을 지도 + 리스트에 표시
document.getElementById("btn-favorites").addEventListener("click", (e) => {
  setActiveButton(e.target);
  showFavorites();
});

function showFavorites() {
  clearMarkers();
  document.getElementById("place-list").innerHTML = "";
  document.getElementById("place-detail").classList.add("hidden");

  if (searchRadiusCircle) {
    searchRadiusCircle.setMap(null);
  }
  document.getElementById("btn-research-area").classList.add("hidden");

  const favorites = Object.values(getFavorites());

  if (favorites.length === 0) {
    document.getElementById("place-list").innerHTML =
      '<p class="empty-message">아직 즐겨찾기한 가게가 없어요. 카드의 ☆ 버튼을 눌러 추가해보세요.</p>';
    return;
  }

  // 즐겨찾기들이 여러 지역에 흩어져 있을 수 있으니, 전부 보이게 지도 범위를 재설정
  const bounds = new kakao.maps.LatLngBounds();

  favorites.forEach((place) => {
    const position = new kakao.maps.LatLng(place.y, place.x);
    bounds.extend(position);

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

    markerEl.addEventListener("click", () => {
      selectPlace(place, position, listItem, markerEl);
    });
  });

  map.setBounds(bounds);
}
