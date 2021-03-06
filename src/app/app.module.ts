import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http'
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { AgmCoreModule } from '@agm/core';
import { ModalModule } from 'ngx-bootstrap/modal';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavComponent } from './components/nav/nav.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { PgnotfoundComponent } from './components/pgnotfound/pgnotfound.component';
import { PlacesAutoCompleteComponent } from './components/placesAutoComplete/placesAutoComplete.component';

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    HomeComponent,
    LoginComponent,
    PgnotfoundComponent,
    PlacesAutoCompleteComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    AgmCoreModule.forRoot({
      apiKey: 'Your API KEY',
      libraries: ['places', 'visualization']
    }),
    //BsDropdownModule.forRoot(),
    ModalModule.forRoot()
  ],
  providers: [], // GoogleMapsAPIWrapper,
  bootstrap: [AppComponent]
})
export class AppModule { }
