import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
  avatar: string;
  creationAt: string;
  updatedAt: string;
}

interface LoginResponse {
  access_token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private apiUrl = 'https://api.escuelajs.co/api/v1';

  constructor(
    private router: Router,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.checkAuthStatus();
  }

  // Expose observables
  get isAuthenticated$(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  get currentUser$(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  // Current auth state
  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  async login(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Primero intenta con la API
      const apiResponse = await this.loginWithAPI(email, password);
      if (apiResponse.success) {
        return apiResponse;
      }

      // Si falla con la API, intenta con usuarios locales
      return this.loginWithLocalUsers(email, password);
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Error de conexión' };
    }
  }

  private async loginWithAPI(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const loginResponse = await this.http.post<LoginResponse>(
        `${this.apiUrl}/auth/login`,
        { email, password }
      ).toPromise();

      if (!loginResponse?.access_token) {
        return { success: false, message: 'Credenciales incorrectas' };
      }

      const userProfile = await this.http.get<User>(
        `${this.apiUrl}/auth/profile`,
        { headers: { Authorization: `Bearer ${loginResponse.access_token}` } }
      ).toPromise();

      if (!userProfile) {
        return { success: false, message: 'Credenciales incorrectas' };
      }

      this.setAuthState(userProfile, loginResponse.access_token);
      return { success: true };

    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        return { 
          success: false, 
          message: error.status === 401 ? 'Credenciales incorrectas' : 'Error del servidor' 
        };
      }
      return { success: false, message: 'Error de conexión con la API' };
    }
  }

  private loginWithLocalUsers(email: string, password: string): { success: boolean; message?: string } {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, message: 'No disponible en el servidor' };
    }

    const users = this.getStoredUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      const fakeToken = `local-${Date.now()}`;
      this.setAuthState(user, fakeToken);
      return { success: true };
    }

    return { success: false, message: 'Credenciales incorrectas' };
  }

  async register(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Primero intenta con la API
      const apiResponse = await this.registerWithAPI(email, password);
      if (apiResponse.success) {
        return apiResponse;
      }

      // Si falla con la API, registra localmente
      return this.registerLocally(email, password);
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Error de conexión' };
    }
  }

  private async registerWithAPI(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.http.post<User>(`${this.apiUrl}/users/`, {
        email,
        password,
        name: email.split('@')[0],
        avatar: 'https://i.pravatar.cc/150?u=' + email
      }).toPromise();

      if (response?.id) {
        return this.loginWithAPI(email, password);
      }
      return { success: false, message: 'Error en el registro' };
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        return { 
          success: false, 
          message: error.status === 400 ? 'El correo ya está registrado' : 'Error del servidor' 
        };
      }
      return { success: false, message: 'Error de conexión con la API' };
    }
  }

  private registerLocally(email: string, password: string): { success: boolean; message?: string } {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, message: 'No disponible en el servidor' };
    }

    const users = this.getStoredUsers();
    
    if (users.find(user => user.email === email)) {
      return { success: false, message: 'Este correo ya está registrado' };
    }

    const newUser: User = {
      id: Date.now(),
      email,
      password,
      name: email.split('@')[0],
      role: 'customer',
      avatar: 'https://i.pravatar.cc/150?u=' + email,
      creationAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    return this.loginWithLocalUsers(email, password);
  }

  private getStoredUsers(): User[] {
    if (isPlatformBrowser(this.platformId)) {
      const usersJson = localStorage.getItem('users');
      return usersJson ? JSON.parse(usersJson) : [];
    }
    return [];
  }

  logout(): void {
    this.clearAuthState();
    this.router.navigate(['/login']);
  }

  private setAuthState(user: User, token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('authToken', token);
    }
    this.isAuthenticatedSubject.next(true);
    this.currentUserSubject.next(user);
  }

  private clearAuthState(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
    }
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
  }

  private checkAuthStatus(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const user = localStorage.getItem('currentUser');
    const token = localStorage.getItem('authToken');

    if (user && token) {
      try {
        const parsedUser = JSON.parse(user);
        this.isAuthenticatedSubject.next(true);
        this.currentUserSubject.next(parsedUser);
      } catch (error) {
        this.clearAuthState();
      }
    }
  }
}