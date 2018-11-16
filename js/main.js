
var map;
var infoWindow;
var bounds;

// Initialize Google map with NYC's coordinate
function initMap() {
    var nyc = {
        lat: 40.730610,
        lng: -73.935242
    };
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 4,
        center: nyc,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: google.maps.ControlPosition.LEFT_CENTER
        }
    });

    infoWindow = new google.maps.InfoWindow();

    bounds = new google.maps.LatLngBounds();

    ko.applyBindings(new viewedLocs());
}

// raise error when an error occurred
function gmError() {
    alert('An error occurred with Google Maps!');
}


var locMarker = function(data) {
    var self = this;

    this.title = data.title;
    this.position = data.location;
    this.street = '',
    this.city = '',
    this.zip = '';

    this.visible = ko.observable(true);

    var clientID = 'XYRC2FECYK04KM4TODERCX20OCOMVPTRBWSTSLO1FS5NGA3W';
    var clientSecret = 'QUOBRX1CIHPX5WGV4BBNYTQUZP2A5QWHPORCG4KIEQWOZKBX';

    // get JSON request of foursquare data
    var fsUrl = 'https://api.foursquare.com/v2/venues/search?ll=' + this.position.lat + ',' + this.position.lng + '&client_id=' + clientID + '&client_secret=' + clientSecret + '&v=20181111' + '&query=' + this.title;

    $.getJSON(fsUrl).done(function(locs) {
		var markers = locs.response.venues[0];
        self.street = markers.location.formattedAddress[0];
        self.city = markers.location.formattedAddress[1];
        self.zip = markers.location.formattedAddress[2];

    }).fail(function() {
        alert('Foursquare is not working properly');
    });

    // Add markers for all the locations
    var image = 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png';

    this.marker = new google.maps.Marker({
        position: this.position,
        title: this.title,
        animation: google.maps.Animation.DROP,
        icon: image
    });

    self.filterMarkers = ko.computed(function () {

        if(self.visible()) {
            self.marker.setMap(map);
            bounds.extend(self.marker.position);
            map.fitBounds(bounds);
        } else {
            self.marker.setMap(null);
        }
    });

    // Create an onclick even to open an indowindow at each marker
    this.marker.addListener('click', function() {
        populateInfoWindow(this, self.street, self.city, self.zip, infoWindow);
        clickBounceAnimation(this);
        map.panTo(this.getPosition());
    });

    // show item info when selected from list
    this.show = function(location) {
        google.maps.event.trigger(self.marker, 'click');
    };

    // creates bounce effect when item selected
    this.bounce = function(place) {
		google.maps.event.trigger(self.marker, 'click');
	};

};


var viewedLocs = function() {
    var self = this;

    this.searchItem = ko.observable('');

    this.mapList = ko.observableArray([]);

    // add location markers for each location
    locations.forEach(function(location) {
        self.mapList.push( new locMarker(location) );
    });

    // locations viewed on map
    this.locationList = ko.computed(function() {
        var searchFilter = self.searchItem().toLowerCase();
        if (searchFilter) {
            return ko.utils.arrayFilter(self.mapList(), function(location) {
                var str = location.title.toLowerCase();
                var result = str.includes(searchFilter);
                location.visible(result);
				return result;
			});
        }
        self.mapList().forEach(function(location) {
            location.visible(true);
        });
        return self.mapList();
    }, self);
};


function populateInfoWindow(marker, street, city, zip, infowindow) {

    if (infowindow.marker != marker) {

        infowindow.setContent('');
        infowindow.marker = marker;

        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });
        var streetViewService = new google.maps.StreetViewService();
        var radius = 80;

        var windowContent = '<h4>' + marker.title + '</h4>' +
            '<p>' + street + "<br>" + city + '<br>' + zip + "</p>";

        var getStreetView = function (data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
                var nearStreetViewLocation = data.location.latLng;
                var heading = google.maps.geometry.spherical.computeHeading(
                    nearStreetViewLocation, marker.position);
                infowindow.setContent(windowContent + '<div id="pano"></div>');
                var panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 20
                    }
                };
                var panorama = new google.maps.StreetViewPanorama(
                    document.getElementById('pano'), panoramaOptions);
            } else {
                infowindow.setContent(windowContent + '<div style="color: red">Street View Not Available</div>');
            }
        };

        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);

        infowindow.open(map, marker);
    }
}

function clickBounceAnimation(marker) {
  if (marker.getAnimation() !== null) {
    marker.setAnimation(null);
  } else {
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() {
        marker.setAnimation(null);
    }, 2000);
  }
}
