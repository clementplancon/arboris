import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
    {
      path: '',
      component: DashboardComponent, // Remplacez par votre composant principal
      canActivate: [authGuard]
    },
    { path: '**', redirectTo: '' }
];
