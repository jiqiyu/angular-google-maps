import { Injectable } from '@angular/core';

import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ValidatorService {

  constructor() { }
  
  canLogin(password: string, user: User): any {
    if (!user) return null;
    if (password === user.password) return user;
    return null;
  }

}