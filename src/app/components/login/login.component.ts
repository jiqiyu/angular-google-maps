import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { UserService } from '../../services/user.service';
import { ValidatorService } from '../../services/validator.service';

import { User } from '../../models/user.model';
import { FeedbackMsg, FeedbackType } from '../../models/feedback-msg.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent implements OnInit, OnDestroy {
  private subs = [];
  isLoggedIn: boolean;
  user: User;
  feedback: FeedbackMsg = new FeedbackMsg();
  loginForm: FormGroup;
  
  constructor(
    private us: UserService,
    private validate: ValidatorService,
    private fb: FormBuilder,
    private router: Router,
  ) { }

  ngOnInit(): void {
    let loginStat$ = this.us.loginStat.subscribe( stat => this.isLoggedIn = stat );
    this.subs.push(loginStat$);
    this.us.setLoginStat( localStorage.getItem('userHasLoggedIn_username') ? true : false );
    if (this.isLoggedIn) {
      this.user = {
        "id": parseInt(localStorage.getItem('userHasLoggedIn_id')),
        "email": localStorage.getItem('userHasLoggedIn_email'),
        "screenName": localStorage.getItem('userHasLoggedIn_username'),
        "password": "[hidden]"
      };
    } else {
      this.loginForm = this.fb.group({
        email: ["", [Validators.required, Validators.email] ],
        psw: ["", [Validators.required] ],
      });
    }
  }

  ngOnDestroy() {
    for(const sub of this.subs) {
      sub.unsubscribe();
    }
  }

  get email() { return this.loginForm.get('email'); }
  get psw() { return this.loginForm.get('psw'); }
  
  onSubmit() {
    let byEmail$ = this.us.getUserByEmail(this.loginForm.value.email).subscribe( res => {
      this.user = this.validate.canLogin(this.loginForm.value.psw, res);
      if (this.user) {
        this.isLoggedIn = true;
        this.us.setLoginStat(true);
        localStorage.setItem('userHasLoggedIn_id', this.user.id.toString());
        localStorage.setItem('userHasLoggedIn_username', this.user.screenName);
        localStorage.setItem('userHasLoggedIn_email', this.user.email);
        this.router.navigate(['/userinfo']);
      } else {
        this.feedback = {
          "for" : "user-login-form",
          "msg": "Error: wrong email or password",
          "type": FeedbackType.Error
        };
        this.isLoggedIn = false;
        this.us.setLoginStat(false);
      }
    });
    this.subs.push(byEmail$);
  }

  logout() {
    this.isLoggedIn = false;
    this.us.setLoginStat(false);
    localStorage.removeItem('userHasLoggedIn_id');
    localStorage.removeItem('userHasLoggedIn_username');
    localStorage.removeItem('userHasLoggedIn_email');
    this.router.navigate(['/login']);
  }
  
}
