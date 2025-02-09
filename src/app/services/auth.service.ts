// auth.service.ts
import { Injectable } from '@angular/core';
import { Auth, signInWithPopup, signOut, GoogleAuthProvider, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Liste des emails autorisés
  private allowedEmails: string[] = [
    'confiance.et.ressources@gmail.com',
    'anais.duclos.pro@gmail.com',
    'clement.plancon.pro@gmail.com',
    'clemplan44600@gmail.com',
    'tibob.unrillaz@gmail.com'
  ];

  // On initialise avec undefined pour indiquer que l’état n’est pas encore déterminé
  user$ = new BehaviorSubject<User | null | undefined>(undefined);

  constructor(
    private auth: Auth,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    // Surveille les changements d'état d'authentification
    this.auth.onAuthStateChanged((user) => {
      this.user$.next(user);
    });
  }

  async loginWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      if (result.user) {
        const userEmail = result.user.email;
        if (userEmail && this.allowedEmails.includes(userEmail)) {
          // Accès autorisé : rediriger vers le dashboard
          this.router.navigate(['/']);
        } else {
          await signOut(this.auth);
          this.snackBar.open(
            'Accès refusé : adresse email non autorisée',
            'Fermer',
            { duration: 3000 }
          );
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'authentification', error);
      this.snackBar.open(
        'Erreur lors de l\'authentification',
        'Fermer',
        { duration: 3000 }
      );
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
}
