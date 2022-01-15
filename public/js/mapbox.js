import mapboxgl from "mapbox-gl";
export const displayMap = (locations) => {
    mapboxgl.accessToken = 'pk.eyJ1Ijoicm9hc3QwMDA3IiwiYSI6ImNreHd2aWJpYjQ4cXcycXFrY2docnQwbWUifQ.9bZDxE23j9biBwyuPb0tew';
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/roast0007/ckxwzo96ua76f14qrurf8zvn6',
        scrollZoom: false,
        // center: [-118.153541,33.768976],
        // zoom: 4,
        // interactive: false
    });
    // map.doubleClickZoom.disable();
    // map.scrollWheelZoom.disable();

    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach(loc => {
        // Create marker
        const el = document.createElement('div');
        el.className = 'marker';

        // Add marker
        new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
        .setLngLat(loc.coordinates)
        .addTo(map);

        // Add popup
        new mapboxgl.Popup({
            offset: 30,
            focusAfterOpen: false
        })
        .setLngLat(loc.coordinates)
        .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
        .addTo(map);

        // Extend map bound to include current location
        bounds.extend(loc.coordinates);
    });

    map.fitBounds(bounds, {
        padding: {
            top: 200,
            bottom: 150,
            left: 100,
            right: 100
        }
    });
};



