import { Component, OnInit, AfterViewInit, OnDestroy, TemplateRef, ViewChild, NgZone } from '@angular/core';
import { Router } from '@angular/router';

import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { MapsAPILoader } from '@agm/core';

import { UserService } from 'src/app/services/user.service';
import { MapsService } from '../../services/maps.service';
import { Coords } from '../../models/maps.model';
import { GmapMarker } from '../../models/maps.model';
import { AirQualIndex } from '../../models/device.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})

export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('addrInput') addrInput: any;
  
  autoAddress: string;
  addressType = "geocode";
  heatmapData: any;
  isValidAddress = false;
  isLoggedIn: boolean;
  map: any;
  exampleMkrLat: number;
  exampleMkrLng: number;
  mapCentreLat: number;
  mapCentreLng: number;
  clientIP: any;
  coords: Coords;
  marker: any;
  markers: Array<GmapMarker> = [];
  userMarkersCopy: Array<GmapMarker>;
  key: string;
  deviceSnaps = [];
  openInfoWindow = false;
  showDevice = true;
  showUser = true;
  trail = {id: undefined, coords: []};
  deviceList: Array<any>;
  deviceMarkers: Array<any> = [];
  deviceIcon = {
    normal: {
      url: "../../assets/shield-fill-check.svg", // person_pin-24px.svg
      scaledSize: {
        width: 32,
        height: 32
      }
    },
    alert: {
      url: "../../assets/shield-fill-exclamation.svg",
      scaledSize: {
        width: 32,
        height: 32
      }
    },
    fatal: {
      url: "../../assets/shield-fill-x.svg",
      scaledSize: {
        width: 32,
        height: 32
      }
    }
  };
  zoom = 11;

  private modalRef: BsModalRef;
  private hmap;
  private subs = [];
  private loginStat$;
  private clientIp$;
  private snapCoords$;
  private deviceSnaps$;
  private deviceList$;
  
  constructor(
    private us: UserService,
    private maps: MapsService,
    private router: Router,
    private modalService: BsModalService,
    private mapsAPILoader: MapsAPILoader,
    private zone: NgZone
  ) { }

  ngOnInit(): void {
    this.loginStat$ = this.us.loginStat.subscribe( stat => this.isLoggedIn = stat );
    this.subs.push(this.loginStat$);
    this.us.setLoginStat( localStorage.getItem('userHasLoggedIn_username') ? true : false );
    
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
    } else {
      /* navigator.geolocation.getCurrentPosition((position) => {
        this.lat = position.coords.latitude;
        this.lng = position.coords.longitude;
        console.log(position);
      }); */
      this.clientIp$ = this.maps.getClientIP().subscribe( data => {
        this.clientIP = data;
        this.mapCentreLat = data.latitude;
        this.mapCentreLng = data.longitude;
        this.exampleMkrLat = data.latitude;
        this.exampleMkrLng = data.longitude;
      });
      this.subs.push(this.clientIp$);
      this.key = 'userHasLoggedIn_coords_' + localStorage.getItem("userHasLoggedIn_username");
      if (localStorage.getItem(this.key) === null) {
        localStorage.setItem(this.key, JSON.stringify([]));
      }
      this.markers = this.markers.concat(this.getMarkersFromLocalStorage());
    }
  }

  ngAfterViewInit() {
    this.mapsAPILoader.load().then(() => {
      this.getPlaceAutocomplete();
      this.heatmapData = this.getPoints();
    });
    
  }

  ngOnDestroy() {
    for(const sub of this.subs) {
      sub.unsubscribe();
    }
  }

  getMapInstance(map: any) {
    this.map = map;
  }

  private getPlaceAutocomplete() {
    const autocomplete = new google.maps.places.Autocomplete( this.addrInput.nativeElement, {
      componentRestrictions: { country: 'AU' },
      types: [this.addressType]  // 'establishment' / 'address' / 'geocode'
    });
    google.maps.event.addListener(autocomplete, 'place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        this.autoAddress = place.formatted_address;
        this.coords = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }; 
        this.zone.run(()=>this.isValidAddress = true);
      } else {
        this.zone.run(()=>this.isValidAddress = false);
      }
    });
  }

  moveMap() {
    this.zone.run(() => {
      if (this.coords === undefined) {
        console.error('Invalid Address'); 
        return null;
      }
      this.mapCentreLat = this.coords.lat;
      this.mapCentreLng = this.coords.lng;
      this.isValidAddress = false;
    });
  }

  resetMapCentre() {
    this.mapCentreLat = this.map.center.lat();
    this.mapCentreLng = this.map.center.lng();
  }

  showDeviceTrail(id: string) {
    this.snapCoords$ = this.maps.getSnapCoords(id).subscribe( data => {
      this.trail.coords = []
      if (this.trail.id === id) {
        this.trail.id = undefined;
        return;
      }
      this.trail.id = id;
      this.trail.coords = data.coords;
    })
    this.subs.push(this.snapCoords$);
  }

  showDeviceSnaps(id: string, max: number) {
    this.deviceSnaps$ = this.maps.getDeviceSnap(id).subscribe ( data => {
      this.deviceSnaps = data.snapshot.slice(max); // max: negative number
    });
    this.subs.push(this.deviceSnaps$);
  }

  toggleHeatmap() {
    if (!this.hmap) {
      this.hmap = new google.maps.visualization.HeatmapLayer({
        data: this.heatmapData,
      });
    }
    this.hmap.setMap(this.hmap.getMap() ? null : this.map);
  }

  hideUserMarkers() {
    this.userMarkersCopy = this.markers;
    this.markers = [];
    this.showUser = !this.showUser;
  }

  showUserMarkers() {
    this.markers = this.userMarkersCopy;
    this.showUser = !this.showUser;
  }

  showDevices() {
    this.deviceList$ = this.maps.getDeviceList().subscribe(
      (data) => {
        this.deviceList = data;

        for (const device of this.deviceList) {
          const latestSnap = device.snapshot[device.snapshot.length - 1];
          let iconUrl: object, 
            temperature: string, 
            airQual: string,
            isDanger = false,
            isFatal = false,
            isDanger_t = false,
            isFatal_t = false,
            isDanger_a = false,
            isFatal_a = false;

          switch (true) {
            case latestSnap.temperature >= 65 || latestSnap.airQual > 2:
              iconUrl = this.deviceIcon.fatal;
              isFatal_t = latestSnap.temperature >= 65 ? true : false
              isFatal = true
              //break;
            case latestSnap.temperature >= 50 || latestSnap.airQual > 1:
              iconUrl = isFatal ? iconUrl : this.deviceIcon.alert
              isDanger_t = (latestSnap.temperature >= 50 && latestSnap.temperature < 65) ? true : false
              isDanger = true
              break;
            default:
              iconUrl = this.deviceIcon.normal
              break;
          }

          temperature = latestSnap.temperature + " Celsius";
          
          switch (true) {
            case latestSnap.airQual === AirQualIndex.Good:
              airQual = "Good"
              break;
            case latestSnap.airQual === AirQualIndex.Normal:
              airQual = "Normal"
              break;
            case latestSnap.airQual === AirQualIndex.Poor:
              airQual = "Poor"
              isDanger_a = true
              break;
            case latestSnap.airQual === AirQualIndex.Toxic:
              airQual = "Toxic"
              isFatal_a = true
              break;
            default:
              isDanger_a = false
              isFatal_a = false
              break;
          }
          
          let m = {
            coords: { lat: latestSnap.coords.lat, lng: latestSnap.coords.lng },
            iconUrl: iconUrl,
            title: device.id,
            fullname: latestSnap.deviceUserFullname,
            temperature: temperature,
            airQual: airQual,
            isDanger: isDanger,
            isFatal: isFatal,
            isDanger_a: isDanger_a,
            isDanger_t: isDanger_t,
            isFatal_a: isFatal_a,
            isFatal_t: isFatal_t
          };
          this.deviceMarkers.push(m);
        }
      }, 
      err => console.error(err),
      () => {
        this.openInfoWindow = true;
        this.showDevice = !this.showDevice;
      }
    );
    this.subs.push(this.deviceList$);
  }

  hideDevices() {
    this.deviceMarkers = [];
    this.trail = { id: undefined, coords: [] };
    this.deviceSnaps = [];
    this.showDevice = !this.showDevice;
  }

  toggleDesc(b?: boolean) {
    this.openInfoWindow = b === undefined ? !this.openInfoWindow : b;
  }

  getCoords(event: any): void {
    this.coords = event.coords;
  }

  consoleLog(what: any) {
    console.log(what);
  }

  getMarker(lat: number, lng: number, idx: number): void {
    this.marker = {
      coords: { lat: lat, lng: lng },
      id: idx
    }
  }

  unMark(): void {
    let arr = JSON.parse(localStorage.getItem(this.key));
    arr.forEach( (el, idx) => {
      let values = el.split('_____'),
          latitude = values[0], 
          longitude = values[1];
      if (latitude === this.marker.coords.lat.toString() &&
          longitude === this.marker.coords.lng.toString()) {
        arr.splice(idx, 1);
        localStorage.setItem(this.key, JSON.stringify(arr));
      }
    });
    this.markers.splice(this.marker.id, 1);
  }

  mark(label: string, title: string, description: string): void {
    let len = this.markers.push(new GmapMarker({
      coords: {
        lat: this.coords.lat, 
        lng: this.coords.lng
      },
      description: description,
      label: label,
      title: title || ( localStorage.getItem("userHasLoggedIn_username") + " marked this place" )
    }));
    if (localStorage.getItem(this.key) === null || localStorage.getItem(this.key) === "[]") {
      localStorage.setItem(this.key, JSON.stringify([this.markers[len-1].key]));
    } else {
      let arr = JSON.parse(localStorage.getItem(this.key));
      arr.push(this.markers[len-1].key);
      localStorage.setItem(this.key, JSON.stringify(arr));
    }
    this.moveMap();
  }

  getMarkersFromLocalStorage(): Array<GmapMarker> {
    let markers: Array<GmapMarker> = [];
    let arr = JSON.parse(localStorage.getItem(this.key));
    if (arr) {
      for (const item of arr) {
        let values = item.split("_____");
        markers.push({
          coords: { lat: parseFloat(values[0]), lng: parseFloat(values[1]) },
          label: values[2],
          title: values[3],
          description: values[4],
          key: item
        });
      }
    }
    return markers;
  }

  openPopup(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template, {class: 'modal-sm'});
  }

  hidePopup() {
    this.modalRef.hide(); 
  }

  private getPoints() {
    return [
      new google.maps.LatLng(-34.982551, 138.645368),
      new google.maps.LatLng(-34.982745, 138.644586),
      new google.maps.LatLng(-34.982842, 138.643688),
      new google.maps.LatLng(-34.982919, 138.642815),
      new google.maps.LatLng(-34.982992, 138.642112),
      new google.maps.LatLng(-34.9831, 138.641461),
      new google.maps.LatLng(-34.983206, 138.640829),
      new google.maps.LatLng(-34.983273, 138.640324),
      new google.maps.LatLng(-34.983316, 138.640023),
      new google.maps.LatLng(-34.983357, 138.639794),
      new google.maps.LatLng(-34.983371, 138.639687),
      new google.maps.LatLng(-34.983368, 138.639666),
      new google.maps.LatLng(-34.983383, 138.639594),
      new google.maps.LatLng(-34.983508, 138.639525),
      new google.maps.LatLng(-34.983842, 138.639591),
      new google.maps.LatLng(-34.984147, 138.639668),
      new google.maps.LatLng(-34.984206, 138.639686),
      new google.maps.LatLng(-34.984386, 138.63979),
      new google.maps.LatLng(-34.984701, 138.639902),
      new google.maps.LatLng(-34.984965, 138.639938),
      new google.maps.LatLng(-34.98501, 138.639947),
      new google.maps.LatLng(-34.98536, 138.639952),
      new google.maps.LatLng(-34.985715, 138.64003),
      new google.maps.LatLng(-34.986117, 138.640119),
      new google.maps.LatLng(-34.986564, 138.640209),
      new google.maps.LatLng(-34.986905, 138.64027),
      new google.maps.LatLng(-34.986956, 138.640279),
      new google.maps.LatLng(-34.800224, 138.63352),
      new google.maps.LatLng(-34.800155, 138.634101),
      new google.maps.LatLng(-34.80016, 138.63443),
      new google.maps.LatLng(-34.800378, 138.634527),
      new google.maps.LatLng(-34.800738, 138.634598),
      new google.maps.LatLng(-34.800938, 138.63465),
      new google.maps.LatLng(-34.801024, 138.634889),
      new google.maps.LatLng(-34.800955, 138.635392),
      new google.maps.LatLng(-34.800886, 138.635959),
      new google.maps.LatLng(-34.800811, 138.636275),
      new google.maps.LatLng(-34.800788, 138.636299),
      new google.maps.LatLng(-34.800719, 138.636302),
      new google.maps.LatLng(-34.800702, 138.636298),
      new google.maps.LatLng(-34.800661, 138.636273),
      new google.maps.LatLng(-34.800395, 138.636172),
      new google.maps.LatLng(-34.800228, 138.636116),
      new google.maps.LatLng(-34.800169, 138.63613),
      new google.maps.LatLng(-34.800066, 138.636167),
      new google.maps.LatLng(-34.984345, 138.622922),
      new google.maps.LatLng(-34.984389, 138.622926),
      new google.maps.LatLng(-34.984437, 138.622924),
      new google.maps.LatLng(-34.984746, 138.622818),
      new google.maps.LatLng(-34.985436, 138.622959),
      new google.maps.LatLng(-34.98612, 138.623112),
      new google.maps.LatLng(-34.986433, 138.623029),
      new google.maps.LatLng(-34.986631, 138.621213),
      new google.maps.LatLng(-34.98666, 138.621033),
      new google.maps.LatLng(-34.986801, 138.620141),
      new google.maps.LatLng(-34.986823, 138.620034),
      new google.maps.LatLng(-34.986831, 138.619916),
      new google.maps.LatLng(-34.987034, 138.618208),
      new google.maps.LatLng(-34.987056, 138.618034),
      new google.maps.LatLng(-34.987169, 138.617145),
      new google.maps.LatLng(-34.987217, 138.616715),
      new google.maps.LatLng(-34.986144, 138.616403),
      new google.maps.LatLng(-34.985292, 138.616257),
      new google.maps.LatLng(-34.980666, 138.590374),
      new google.maps.LatLng(-34.980501, 138.591281),
      new google.maps.LatLng(-34.980148, 138.592052),
      new google.maps.LatLng(-34.980173, 138.591148),
      new google.maps.LatLng(-34.980693, 138.590592),
      new google.maps.LatLng(-34.981261, 138.591142),
      new google.maps.LatLng(-34.981808, 138.59173),
      new google.maps.LatLng(-34.98234, 138.592341),
      new google.maps.LatLng(-34.982812, 138.593022),
      new google.maps.LatLng(-34.9833, 138.593672),
      new google.maps.LatLng(-34.983809, 138.594275),
      new google.maps.LatLng(-34.984246, 138.594979),
      new google.maps.LatLng(-34.984791, 138.595958),
      new google.maps.LatLng(-34.985675, 138.596746),
      new google.maps.LatLng(-34.986262, 138.59578),
      new google.maps.LatLng(-34.986776, 138.595093),
      new google.maps.LatLng(-34.987282, 138.594426),
      new google.maps.LatLng(-34.987783, 138.593767),
      new google.maps.LatLng(-34.988343, 138.593184),
      new google.maps.LatLng(-34.988895, 138.592506),
      new google.maps.LatLng(-34.989371, 138.591701),
      new google.maps.LatLng(-34.989722, 138.590952),
      new google.maps.LatLng(-34.990315, 138.590305),
      new google.maps.LatLng(-34.990738, 138.589616),
      new google.maps.LatLng(-34.979448, 138.638702),
      new google.maps.LatLng(-34.979023, 138.638585),
      new google.maps.LatLng(-34.978542, 138.638492),
      new google.maps.LatLng(-34.9781, 138.638411),
      new google.maps.LatLng(-34.977986, 138.638376),
      new google.maps.LatLng(-34.97768, 138.638313),
      new google.maps.LatLng(-34.977316, 138.638273),
      new google.maps.LatLng(-34.977135, 138.638254),
      new google.maps.LatLng(-34.976987, 138.638303),
      new google.maps.LatLng(-34.976946, 138.638404),
      new google.maps.LatLng(-34.976944, 138.638467),
      new google.maps.LatLng(-34.976892, 138.638459),
      new google.maps.LatLng(-34.976842, 138.638442),
      new google.maps.LatLng(-34.976822, 138.638391),
      new google.maps.LatLng(-34.976814, 138.638412),
      new google.maps.LatLng(-34.976787, 138.638628),
      new google.maps.LatLng(-34.976729, 138.63865),
      new google.maps.LatLng(-34.976759, 138.638677),
      new google.maps.LatLng(-34.976772, 138.638498),
      new google.maps.LatLng(-34.976787, 138.638389),
      new google.maps.LatLng(-34.976848, 138.638283),
      new google.maps.LatLng(-34.97687, 138.638239),
      new google.maps.LatLng(-34.977015, 138.638198),
      new google.maps.LatLng(-34.977333, 138.638256),
      new google.maps.LatLng(-34.977595, 138.638308),
      new google.maps.LatLng(-34.977797, 138.638344),
      new google.maps.LatLng(-34.97816, 138.638442),
      new google.maps.LatLng(-34.978414, 138.638508),
      new google.maps.LatLng(-34.978445, 138.638516),
      new google.maps.LatLng(-34.978503, 138.638529),
      new google.maps.LatLng(-34.978607, 138.638549),
      new google.maps.LatLng(-34.97867, 138.638644),
      new google.maps.LatLng(-34.978847, 138.638706),
      new google.maps.LatLng(-34.97924, 138.638744),
      new google.maps.LatLng(-34.979738, 138.638822),
      new google.maps.LatLng(-34.980201, 138.638882),
      new google.maps.LatLng(-34.9804, 138.638905),
      new google.maps.LatLng(-34.980501, 138.638921),
      new google.maps.LatLng(-34.980892, 138.638986),
      new google.maps.LatLng(-34.981446, 138.639087),
      new google.maps.LatLng(-34.981985, 138.639199),
      new google.maps.LatLng(-34.982239, 138.639249),
      new google.maps.LatLng(-34.982286, 138.639266),
      new google.maps.LatLng(-34.997847, 138.629388),
      new google.maps.LatLng(-34.997874, 138.62918),
      new google.maps.LatLng(-34.997885, 138.629069),
      new google.maps.LatLng(-34.997887, 138.62905),
      new google.maps.LatLng(-34.997933, 138.628954),
      new google.maps.LatLng(-34.998242, 138.62899),
      new google.maps.LatLng(-34.998617, 138.629075),
      new google.maps.LatLng(-34.998719, 138.629092),
      new google.maps.LatLng(-34.998944, 138.629145),
      new google.maps.LatLng(-34.99932, 138.629251),
      new google.maps.LatLng(-34.99959, 138.629309),
      new google.maps.LatLng(-34.999677, 138.629324),
      new google.maps.LatLng(-34.999966, 138.62936),
      new google.maps.LatLng(-34.800288, 138.62943),
      new google.maps.LatLng(-34.800443, 138.629461),
      new google.maps.LatLng(-34.800465, 138.629474),
      new google.maps.LatLng(-34.800644, 138.62954),
      new google.maps.LatLng(-34.800948, 138.62962),
      new google.maps.LatLng(-34.801242, 138.629685),
      new google.maps.LatLng(-34.801375, 138.629702),
      new google.maps.LatLng(-34.8014, 138.629703),
      new google.maps.LatLng(-34.801453, 138.629707),
      new google.maps.LatLng(-34.801473, 138.629709),
      new google.maps.LatLng(-34.801532, 138.629707),
      new google.maps.LatLng(-34.801852, 138.629729),
      new google.maps.LatLng(-34.802173, 138.629789),
      new google.maps.LatLng(-34.802459, 138.629847),
      new google.maps.LatLng(-34.802554, 138.629825),
      new google.maps.LatLng(-34.802647, 138.629549),
      new google.maps.LatLng(-34.802693, 138.629179),
      new google.maps.LatLng(-34.802729, 138.628751),
      new google.maps.LatLng(-34.966104, 138.609291),
      new google.maps.LatLng(-34.966103, 138.609268),
      new google.maps.LatLng(-34.966138, 138.609229),
      new google.maps.LatLng(-34.966183, 138.609231),
      new google.maps.LatLng(-34.966153, 138.609276),
      new google.maps.LatLng(-34.966005, 138.609365),
      new google.maps.LatLng(-34.965897, 138.60957),
      new google.maps.LatLng(-34.965767, 138.609739),
      new google.maps.LatLng(-34.965693, 138.610389),
      new google.maps.LatLng(-34.965615, 138.611201),
      new google.maps.LatLng(-34.965533, 138.612121),
      new google.maps.LatLng(-34.965467, 138.612939),
      new google.maps.LatLng(-34.965444, 138.614821),
      new google.maps.LatLng(-34.965444, 138.614964),
      new google.maps.LatLng(-34.965318, 138.615424),
      new google.maps.LatLng(-34.963961, 138.615296),
      new google.maps.LatLng(-34.963115, 138.615196),
      new google.maps.LatLng(-34.962967, 138.615183),
      new google.maps.LatLng(-34.962278, 138.615127),
      new google.maps.LatLng(-34.961675, 138.615055),
      new google.maps.LatLng(-34.960932, 138.614988),
      new google.maps.LatLng(-34.959337, 138.614862),
      new google.maps.LatLng(-34.973187, 138.621922),
      new google.maps.LatLng(-34.973043, 138.622118),
      new google.maps.LatLng(-34.973007, 138.622165),
      new google.maps.LatLng(-34.972979, 138.622219),
      new google.maps.LatLng(-34.972865, 138.622394),
      new google.maps.LatLng(-34.972779, 138.622503),
      new google.maps.LatLng(-34.972676, 138.622701),
      new google.maps.LatLng(-34.972606, 138.622806),
      new google.maps.LatLng(-34.972566, 138.62284),
      new google.maps.LatLng(-34.972508, 138.622852),
      new google.maps.LatLng(-34.972387, 138.623011),
      new google.maps.LatLng(-34.972099, 138.623328),
      new google.maps.LatLng(-34.971704, 138.623783),
      new google.maps.LatLng(-34.971481, 138.624081),
      new google.maps.LatLng(-34.9714, 138.624179),
      new google.maps.LatLng(-34.971352, 138.62422),
      new google.maps.LatLng(-34.971248, 138.624327),
      new google.maps.LatLng(-34.970904, 138.624781),
      new google.maps.LatLng(-34.97052, 138.625283),
      new google.maps.LatLng(-34.970337, 138.625553),
      new google.maps.LatLng(-34.970128, 138.625832),
      new google.maps.LatLng(-34.969756, 138.626331),
      new google.maps.LatLng(-34.9693, 138.626902),
      new google.maps.LatLng(-34.969132, 138.627065),
      new google.maps.LatLng(-34.969092, 138.627103),
      new google.maps.LatLng(-34.968979, 138.627172),
      new google.maps.LatLng(-34.968595, 138.627634),
      new google.maps.LatLng(-34.968372, 138.627913),
      new google.maps.LatLng(-34.968337, 138.627961),
      new google.maps.LatLng(-34.968244, 138.628138),
      new google.maps.LatLng(-34.967942, 138.628581),
      new google.maps.LatLng(-34.967482, 138.629094),
      new google.maps.LatLng(-34.967031, 138.629606),
      new google.maps.LatLng(-34.966732, 138.629986),
      new google.maps.LatLng(-34.96668, 138.630058),
      new google.maps.LatLng(-34.966633, 138.630109),
      new google.maps.LatLng(-34.96658, 138.630211),
      new google.maps.LatLng(-34.966367, 138.630594),
      new google.maps.LatLng(-34.96591, 138.631137),
      new google.maps.LatLng(-34.965353, 138.631806),
      new google.maps.LatLng(-34.964962, 138.632298),
      new google.maps.LatLng(-34.964868, 138.632486),
      new google.maps.LatLng(-34.964518, 138.632913),
      new google.maps.LatLng(-34.963435, 138.634173),
      new google.maps.LatLng(-34.962847, 138.634953),
      new google.maps.LatLng(-34.962291, 138.635935),
      new google.maps.LatLng(-34.962224, 138.636074),
      new google.maps.LatLng(-34.961957, 138.636892),
      new google.maps.LatLng(-34.961652, 138.638886),
      new google.maps.LatLng(-34.961284, 138.639955),
      new google.maps.LatLng(-34.96121, 138.640068),
      new google.maps.LatLng(-34.961064, 138.64072),
      new google.maps.LatLng(-34.96104, 138.641411),
      new google.maps.LatLng(-34.961048, 138.642324),
      new google.maps.LatLng(-34.960851, 138.643118),
      new google.maps.LatLng(-34.959977, 138.644591),
      new google.maps.LatLng(-34.959913, 138.644698),
      new google.maps.LatLng(-34.959623, 138.645065),
      new google.maps.LatLng(-34.958902, 138.645158),
      new google.maps.LatLng(-34.958428, 138.64457),
      new google.maps.LatLng(-34.957687, 138.64334),
      new google.maps.LatLng(-34.957583, 138.64324),
      new google.maps.LatLng(-34.957019, 138.642787),
      new google.maps.LatLng(-34.956603, 138.642322),
      new google.maps.LatLng(-34.95638, 138.641602),
      new google.maps.LatLng(-34.95579, 138.641382),
      new google.maps.LatLng(-34.954493, 138.642133),
      new google.maps.LatLng(-34.954361, 138.642206),
      new google.maps.LatLng(-34.953719, 138.64265),
      new google.maps.LatLng(-34.953096, 138.642915),
      new google.maps.LatLng(-34.951617, 138.643211),
      new google.maps.LatLng(-34.951496, 138.643246),
      new google.maps.LatLng(-34.950733, 138.643428),
      new google.maps.LatLng(-34.950126, 138.643536),
      new google.maps.LatLng(-34.950103, 138.643784),
      new google.maps.LatLng(-34.95039, 138.64401),
      new google.maps.LatLng(-34.950448, 138.644013),
      new google.maps.LatLng(-34.950536, 138.64404),
      new google.maps.LatLng(-34.950493, 138.644141),
      new google.maps.LatLng(-34.990859, 138.602808),
      new google.maps.LatLng(-34.990864, 138.602768),
      new google.maps.LatLng(-34.990995, 138.602539),
      new google.maps.LatLng(-34.991148, 138.602172),
      new google.maps.LatLng(-34.991385, 138.601312),
      new google.maps.LatLng(-34.991405, 138.600776),
      new google.maps.LatLng(-34.991288, 138.600528),
      new google.maps.LatLng(-34.991113, 138.600441),
      new google.maps.LatLng(-34.991027, 138.600395),
      new google.maps.LatLng(-34.991094, 138.600311),
      new google.maps.LatLng(-34.991211, 138.600183),
      new google.maps.LatLng(-34.99106, 138.599334),
      new google.maps.LatLng(-34.990538, 138.598718),
      new google.maps.LatLng(-34.990095, 138.598086),
      new google.maps.LatLng(-34.989644, 138.59736),
      new google.maps.LatLng(-34.989254, 138.596844),
      new google.maps.LatLng(-34.988855, 138.596397),
      new google.maps.LatLng(-34.988483, 138.595963),
      new google.maps.LatLng(-34.988015, 138.595365),
      new google.maps.LatLng(-34.987558, 138.594735),
      new google.maps.LatLng(-34.987472, 138.594323),
      new google.maps.LatLng(-34.98763, 138.594025),
      new google.maps.LatLng(-34.987767, 138.593987),
      new google.maps.LatLng(-34.987486, 138.594452),
      new google.maps.LatLng(-34.986977, 138.595043),
      new google.maps.LatLng(-34.986583, 138.595552),
      new google.maps.LatLng(-34.98654, 138.59561),
      new google.maps.LatLng(-34.986516, 138.595659),
      new google.maps.LatLng(-34.986378, 138.595707),
      new google.maps.LatLng(-34.986044, 138.595362),
      new google.maps.LatLng(-34.985598, 138.594715),
      new google.maps.LatLng(-34.985321, 138.594361),
      new google.maps.LatLng(-34.985207, 138.594236),
      new google.maps.LatLng(-34.985751, 138.594062),
      new google.maps.LatLng(-34.985996, 138.593881),
      new google.maps.LatLng(-34.986092, 138.59383),
      new google.maps.LatLng(-34.985998, 138.593899),
      new google.maps.LatLng(-34.985114, 138.594365),
      new google.maps.LatLng(-34.985022, 138.594441),
      new google.maps.LatLng(-34.984823, 138.594635),
      new google.maps.LatLng(-34.984719, 138.594629),
      new google.maps.LatLng(-34.985069, 138.594176),
      new google.maps.LatLng(-34.9855, 138.59365),
      new google.maps.LatLng(-34.98577, 138.593291),
      new google.maps.LatLng(-34.985839, 138.593159),
      new google.maps.LatLng(-34.982651, 138.600628),
      new google.maps.LatLng(-34.982616, 138.600599),
      new google.maps.LatLng(-34.982702, 138.60047),
      new google.maps.LatLng(-34.982915, 138.600192),
      new google.maps.LatLng(-34.983137, 138.599887),
      new google.maps.LatLng(-34.983414, 138.599519),
      new google.maps.LatLng(-34.983629, 138.599237),
      new google.maps.LatLng(-34.983688, 138.599157),
      new google.maps.LatLng(-34.983716, 138.599106),
      new google.maps.LatLng(-34.983798, 138.599072),
      new google.maps.LatLng(-34.983997, 138.599186),
      new google.maps.LatLng(-34.984271, 138.599538),
      new google.maps.LatLng(-34.984577, 138.599948),
      new google.maps.LatLng(-34.984828, 138.60026),
      new google.maps.LatLng(-34.984999, 138.600477),
      new google.maps.LatLng(-34.985113, 138.600651),
      new google.maps.LatLng(-34.985155, 138.600703),
      new google.maps.LatLng(-34.985192, 138.600749),
      new google.maps.LatLng(-34.985278, 138.600839),
      new google.maps.LatLng(-34.985387, 138.600857),
      new google.maps.LatLng(-34.985478, 138.60089),
      new google.maps.LatLng(-34.985526, 138.601022),
      new google.maps.LatLng(-34.985598, 138.601148),
      new google.maps.LatLng(-34.985631, 138.601202),
      new google.maps.LatLng(-34.98566, 138.601267),
      new google.maps.LatLng(-34.803986, 138.626035),
      new google.maps.LatLng(-34.804102, 138.625089),
      new google.maps.LatLng(-34.804211, 138.624156),
      new google.maps.LatLng(-34.803861, 138.623385),
      new google.maps.LatLng(-34.803151, 138.623214),
      new google.maps.LatLng(-34.802439, 138.623077),
      new google.maps.LatLng(-34.80174, 138.622905),
      new google.maps.LatLng(-34.801069, 138.622785),
      new google.maps.LatLng(-34.800345, 138.622649),
      new google.maps.LatLng(-34.999633, 138.622603),
      new google.maps.LatLng(-34.99975, 138.6217),
      new google.maps.LatLng(-34.999885, 138.620854),
      new google.maps.LatLng(-34.999209, 138.620607),
      new google.maps.LatLng(-34.995656, 138.600395),
      new google.maps.LatLng(-34.995203, 138.600304),
      new google.maps.LatLng(-34.978738, 138.615584),
      new google.maps.LatLng(-34.978812, 138.615189),
      new google.maps.LatLng(-34.978824, 138.615092),
      new google.maps.LatLng(-34.978833, 138.614932),
      new google.maps.LatLng(-34.978834, 138.614898),
      new google.maps.LatLng(-34.97874, 138.614757),
      new google.maps.LatLng(-34.978501, 138.614433),
      new google.maps.LatLng(-34.978182, 138.614026),
      new google.maps.LatLng(-34.977851, 138.613623),
      new google.maps.LatLng(-34.977486, 138.613166),
      new google.maps.LatLng(-34.977109, 138.612674),
      new google.maps.LatLng(-34.976743, 138.612186),
      new google.maps.LatLng(-34.97644, 138.6118),
      new google.maps.LatLng(-34.976295, 138.611614),
      new google.maps.LatLng(-34.976158, 138.61144),
      new google.maps.LatLng(-34.975806, 138.610997),
      new google.maps.LatLng(-34.975422, 138.610484),
      new google.maps.LatLng(-34.975126, 138.610087),
      new google.maps.LatLng(-34.975012, 138.609854),
      new google.maps.LatLng(-34.975164, 138.609573),
      new google.maps.LatLng(-34.975498, 138.60918),
      new google.maps.LatLng(-34.975868, 138.60873),
      new google.maps.LatLng(-34.976256, 138.60824),
      new google.maps.LatLng(-34.976519, 138.607928),
      new google.maps.LatLng(-34.976539, 138.607904),
      new google.maps.LatLng(-34.976595, 138.607854),
      new google.maps.LatLng(-34.976853, 138.607547),
      new google.maps.LatLng(-34.977234, 138.607087),
      new google.maps.LatLng(-34.977644, 138.606558),
      new google.maps.LatLng(-34.978066, 138.606017),
      new google.maps.LatLng(-34.978468, 138.605499),
      new google.maps.LatLng(-34.978866, 138.604995),
      new google.maps.LatLng(-34.979295, 138.604455),
      new google.maps.LatLng(-34.979695, 138.60395),
      new google.maps.LatLng(-34.979982, 138.603584),
      new google.maps.LatLng(-34.980295, 138.603223),
      new google.maps.LatLng(-34.980664, 138.602766),
      new google.maps.LatLng(-34.981043, 138.602288),
      new google.maps.LatLng(-34.981399, 138.601823),
      new google.maps.LatLng(-34.981727, 138.601407),
      new google.maps.LatLng(-34.981853, 138.601247),
      new google.maps.LatLng(-34.981894, 138.601195),
      new google.maps.LatLng(-34.982076, 138.600977),
      new google.maps.LatLng(-34.982338, 138.600603),
      new google.maps.LatLng(-34.982666, 138.600133),
      new google.maps.LatLng(-34.983048, 138.599634),
      new google.maps.LatLng(-34.98345, 138.599198),
      new google.maps.LatLng(-34.983791, 138.598998),
      new google.maps.LatLng(-34.984177, 138.598959),
      new google.maps.LatLng(-34.984388, 138.598971),
      new google.maps.LatLng(-34.984404, 138.599128),
      new google.maps.LatLng(-34.984586, 138.599524),
      new google.maps.LatLng(-34.984835, 138.599927),
      new google.maps.LatLng(-34.985116, 138.600307),
      new google.maps.LatLng(-34.985282, 138.600539),
      new google.maps.LatLng(-34.985346, 138.600692),
      new google.maps.LatLng(-34.965769, 138.607201),
      new google.maps.LatLng(-34.96579, 138.607414),
      new google.maps.LatLng(-34.965802, 138.607755),
      new google.maps.LatLng(-34.965791, 138.608219),
      new google.maps.LatLng(-34.965763, 138.608759),
      new google.maps.LatLng(-34.965726, 138.609348),
      new google.maps.LatLng(-34.965716, 138.609882),
      new google.maps.LatLng(-34.965708, 138.610202),
      new google.maps.LatLng(-34.965705, 138.610253),
      new google.maps.LatLng(-34.965707, 138.610369),
      new google.maps.LatLng(-34.965692, 138.61072),
      new google.maps.LatLng(-34.965699, 138.611215),
      new google.maps.LatLng(-34.965687, 138.611789),
      new google.maps.LatLng(-34.965666, 138.612373),
      new google.maps.LatLng(-34.965598, 138.612883),
      new google.maps.LatLng(-34.965543, 138.613039),
      new google.maps.LatLng(-34.965532, 138.613125),
      new google.maps.LatLng(-34.9655, 138.613553),
      new google.maps.LatLng(-34.965448, 138.614053),
      new google.maps.LatLng(-34.965388, 138.614645),
      new google.maps.LatLng(-34.965323, 138.61525),
      new google.maps.LatLng(-34.965303, 138.615847),
      new google.maps.LatLng(-34.965251, 138.616439),
      new google.maps.LatLng(-34.965204, 138.61702),
      new google.maps.LatLng(-34.965172, 138.617556),
      new google.maps.LatLng(-34.965164, 138.618075),
      new google.maps.LatLng(-34.965153, 138.618618),
      new google.maps.LatLng(-34.965136, 138.619112),
      new google.maps.LatLng(-34.965129, 138.619378),
      new google.maps.LatLng(-34.965119, 138.619481),
      new google.maps.LatLng(-34.9651, 138.619852),
      new google.maps.LatLng(-34.965083, 138.620349),
      new google.maps.LatLng(-34.965045, 138.62093),
      new google.maps.LatLng(-34.964992, 138.621481),
      new google.maps.LatLng(-34.96498, 138.621695),
      new google.maps.LatLng(-34.964993, 138.621843),
      new google.maps.LatLng(-34.964986, 138.622255),
      new google.maps.LatLng(-34.964975, 138.622823),
      new google.maps.LatLng(-34.964939, 138.623411),
      new google.maps.LatLng(-34.964902, 138.624014),
      new google.maps.LatLng(-34.964853, 138.624576),
      new google.maps.LatLng(-34.964826, 138.624922),
      new google.maps.LatLng(-34.964796, 138.625375),
      new google.maps.LatLng(-34.964782, 138.625869),
      new google.maps.LatLng(-34.964768, 138.626089),
      new google.maps.LatLng(-34.964766, 138.626117),
      new google.maps.LatLng(-34.964723, 138.626276),
      new google.maps.LatLng(-34.964681, 138.626649),
      new google.maps.LatLng(-34.982012, 138.6042),
      new google.maps.LatLng(-34.981574, 138.604911),
      new google.maps.LatLng(-34.981055, 138.605597),
      new google.maps.LatLng(-34.980479, 138.606341),
      new google.maps.LatLng(-34.979996, 138.606939),
      new google.maps.LatLng(-34.979459, 138.607613),
      new google.maps.LatLng(-34.978953, 138.608228),
      new google.maps.LatLng(-34.978409, 138.608839),
      new google.maps.LatLng(-34.977842, 138.609501),
      new google.maps.LatLng(-34.977334, 138.610181),
      new google.maps.LatLng(-34.976809, 138.610836),
      new google.maps.LatLng(-34.97624, 138.611514),
      new google.maps.LatLng(-34.975725, 138.612145),
      new google.maps.LatLng(-34.97519, 138.612805),
      new google.maps.LatLng(-34.974672, 138.613464),
      new google.maps.LatLng(-34.974084, 138.614186),
      new google.maps.LatLng(-34.973533, 138.613636),
      new google.maps.LatLng(-34.973021, 138.613009),
      new google.maps.LatLng(-34.972501, 138.612371),
      new google.maps.LatLng(-34.971964, 138.611681),
      new google.maps.LatLng(-34.971479, 138.611078),
      new google.maps.LatLng(-34.970992, 138.610477),
      new google.maps.LatLng(-34.970467, 138.609801),
      new google.maps.LatLng(-34.97009, 138.608904),
      new google.maps.LatLng(-34.969657, 138.608103),
      new google.maps.LatLng(-34.969132, 138.607276),
      new google.maps.LatLng(-34.968564, 138.606469),
      new google.maps.LatLng(-34.96798, 138.605745),
      new google.maps.LatLng(-34.96738, 138.605299),
      new google.maps.LatLng(-34.966604, 138.605297),
      new google.maps.LatLng(-34.965838, 138.6052),
      new google.maps.LatLng(-34.965139, 138.605139),
      new google.maps.LatLng(-34.964457, 138.605094),
      new google.maps.LatLng(-34.963716, 138.605142),
      new google.maps.LatLng(-34.962932, 138.605398),
      new google.maps.LatLng(-34.962126, 138.605813),
      new google.maps.LatLng(-34.961344, 138.606215),
      new google.maps.LatLng(-34.960556, 138.606495),
      new google.maps.LatLng(-34.959732, 138.606484),
      new google.maps.LatLng(-34.95891, 138.606228),
      new google.maps.LatLng(-34.958182, 138.605695),
      new google.maps.LatLng(-34.957676, 138.605118),
      new google.maps.LatLng(-34.957039, 138.604346),
      new google.maps.LatLng(-34.956335, 138.603719),
      new google.maps.LatLng(-34.955503, 138.603406),
      new google.maps.LatLng(-34.954665, 138.603242),
      new google.maps.LatLng(-34.953837, 138.603172),
      new google.maps.LatLng(-34.952986, 138.603112),
      new google.maps.LatLng(-34.951266, 138.603355),
    ];
  }

}