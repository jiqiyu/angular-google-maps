import { Component, Output, OnInit, ViewChild, EventEmitter } from '@angular/core';
import { MapsAPILoader } from '@agm/core';
import { Coords } from 'src/app/models/maps.model';

@Component({
  selector: 'places-autocomplete',
  template: `
  <input type="text" 
    placeholder="Or Enter An Address Here" 
    [(ngModel)]="autoAddress"
    #addrInput>
  `,
  styles: [`
    input {width: 100%; border: none; outline: none;} 
    input:focus {width: 100%; border: none; outline: none;}
  `
  ]
})
export class PlacesAutoCompleteComponent implements OnInit {
  @ViewChild('addrInput') addrInput: any;
  @Output('addressCoords') addressCoords = new EventEmitter();

  addressType = "geocode";
  autoAddress: string;
  coords: Coords;
  countryCode: string = 'AU';

  constructor(private mapsAPILoader: MapsAPILoader) { }

  ngOnInit(): void {
    this.mapsAPILoader.load().then(() => {
      this.getPlaceAutocomplete();
    });
  }

  private getPlaceAutocomplete() {
    const autocomplete = new google.maps.places.Autocomplete( this.addrInput.nativeElement, {
      componentRestrictions: { country: this.countryCode },
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
        this.addressCoords.emit(this.coords);
      } else {
        this.addressCoords.emit(null);
      }
    });
  }

}
