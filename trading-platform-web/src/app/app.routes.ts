import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Stocks } from './pages/stocks/stocks';
import { History } from './pages/history/history';
import { Admin } from './pages/admin/admin';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

// route table path to component
export const routes: Routes = [
  { path: '', component: Home }, // landing page
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  // authguard runs first not logged in goes to login
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  // stocks replaces the old trade page buy sell via a popup
  { path: 'stocks', component: Stocks, canActivate: [authGuard] },
  { path: 'history', component: History, canActivate: [authGuard] },
  { path: 'trade', redirectTo: 'stocks' }, // keep old links working
  // both guards run logged in and admin
  { path: 'admin', component: Admin, canActivate: [authGuard, adminGuard] },
  // unknown urls fall back to the landing page
  { path: '**', redirectTo: '' }
];
