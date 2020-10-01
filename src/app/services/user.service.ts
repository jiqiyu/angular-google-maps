import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})

export class UserService {

  userurl = '../assets/users.json';
  private source = new BehaviorSubject<boolean>(null);
  loginStat = this.source.asObservable();

  constructor(
    private http: HttpClient,
  ) { }
  
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.userurl);
  }
  
  getUserByEmail(email: string): Observable<User> {
    return this.getUsers().pipe(
      map( (users: User[]) => users.find( user => user.email === email ) )
    );
  }

  setLoginStat(stat: boolean) {
    this.source.next(stat);
  }

}

