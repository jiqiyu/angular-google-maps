import { Component, OnInit, Input } from '@angular/core';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})

export class NavComponent implements OnInit { 
  private subs = [];
  private loginStat$;
  name: string;
  isLoggedIn: boolean;
  isCollapsed: boolean = true;
  
  constructor( private us: UserService ) { }

  ngOnInit(): void {
    this.loginStat$ = this.us.loginStat.subscribe( stat => {
      this.isLoggedIn = stat;
      this.name = localStorage.getItem('userHasLoggedIn_username');
    });
    this.subs.push(this.loginStat$);
  }

  ngOnDestroy() {
    for(const sub of this.subs) {
      sub.unsubscribe();
    }
  }

  toggleDropdownMenu(): void {
    this.isCollapsed = !this.isCollapsed;
  }
  
}
