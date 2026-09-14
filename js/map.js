// 1. 지도를 그릴 HTML 요소
const mapContainer = document.getElementById("map");

// 2. 기본 좌표 (위치를 못 가져올 경우를 대비한 기본값 - 서울시청)
const defaultCenter = new kakao.maps.LatLng(37.5665, 126.978);

// 3. 지도 생성 (일단 기본 좌표로 먼저 띄운다)
const mapOption = {
  center: defaultCenter,
  level: 4,
};
const map = new kakao.maps.Map(mapContainer, mapOption);

// js/search.js, js/location-search.js에서도 참조할 수 있도록 현재 위치를 전역 변수로 관리
let currentLocation = defaultCenter;

// 내 위치를 표시하는 점 마커 - 재요청 시 이전 것을 지우고 새로 찍기 위해 참조를 기억해둠
let myLocationOverlay = null;

// 사용자의 현재 위치를 가져와서 지도 중심을 옮기고 파란 점으로 표시
// 페이지 로드 시 한 번 자동 실행되고, 검색창의 "현재 위치로 검색" 버튼에서도 재사용됨
function useMyLocation() {
  if (!navigator.geolocation) {
    alert("이 브라우저는 위치 정보 기능을 지원하지 않습니다.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    // 위치 가져오기 성공 시
    (position) => {
      const { latitude, longitude } = position.coords;
      const userLocation = new kakao.maps.LatLng(latitude, longitude);
      currentLocation = userLocation; // 검색에 사용할 현재 위치 값 갱신
      map.setCenter(userLocation);

      // 이전 내 위치 점이 있으면 지우고 새로 찍기 (중복 방지)
      if (myLocationOverlay) {
        myLocationOverlay.setMap(null);
      }
      myLocationOverlay = new kakao.maps.CustomOverlay({
        position: userLocation,
        content: '<div class="my-location-marker"></div>',
        map: map,
      });

      // 검색 결과가 남아있다면 새 위치와 무관하니 정리
      // (search.js가 이 시점엔 이미 로드되어 있어서 안전하게 호출 가능)
      if (typeof clearMarkers === "function") {
        clearMarkers();
        document.getElementById("place-list").innerHTML = "";
        document.getElementById("place-detail").classList.add("hidden");
      }
      document.getElementById("btn-research-area").classList.add("hidden");
    },
    // 위치 가져오기 실패 시 (권한 거부 등)
    (error) => {
      console.warn("위치 정보를 가져오지 못했습니다:", error.message);
      alert("위치 정보를 가져올 수 없어 기본 위치(서울시청)로 표시합니다.");
    },
  );
}

// 페이지 로드 시 한 번 자동으로 내 위치를 가져옴
useMyLocation();

kakao.maps.event.addListener(map, "dragend", () => {
  document.getElementById("btn-research-area").classList.remove("hidden");
});
