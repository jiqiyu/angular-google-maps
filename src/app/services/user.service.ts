import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})

export class UserService {

  userurl = '../assets/users.json';
  private source = new Subject<boolean>();
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

