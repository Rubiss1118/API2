import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PokemonService, Pokemon, PokemonType } from '../../services/pokemon.service';
import { AuthService, User } from '../../services/auth.service';
import { forkJoin, Subscription } from 'rxjs';

// Interfaz extendida para incluir propiedades de control
interface ExtendedPokemon extends Pokemon {
  isDeleted?: boolean;
  isModified?: boolean;
}

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    

      <!-- Loading -->
      <div *ngIf="isLoading" class="loading">
        <div class="spinner"></div>
        <p>Cargando Pokémon...</p>
      </div>

      <!-- Search and Filter Bar -->
      <div *ngIf="!isLoading" class="search-filter-container">
        <div class="search-section">
          <div class="search-input-container">
            <input 
              type="text" 
              [(ngModel)]="searchTerm"
              (input)="onSearchChange()"
              placeholder="Buscar por nombre o número..."
              class="search-input">
            <span class="search-icon">🔍</span>
          </div>
          
          <div class="filter-controls">
            <select [(ngModel)]="sortBy" (change)="onFilterChange()" class="sort-select">
              <option value="id">Ordenar por ID</option>
              <option value="name">Ordenar por Nombre</option>
              <option value="height">Ordenar por Altura</option>
              <option value="weight">Ordenar por Peso</option>
            </select>
            
            <select [(ngModel)]="sortOrder" (change)="onFilterChange()" class="order-select">
              <option value="asc">↑ Ascendente</option>
              <option value="desc">↓ Descendente</option>
            </select>
            
            <button (click)="clearAllFilters()" class="clear-filters-btn">
              🗑️ Limpiar Filtros
            </button>

            <button (click)="resetAllData()" class="reset-data-btn" title="Restaurar todos los Pokémon originales">
              🔄 Resetear Todo
            </button>
          </div>
        </div>
        
        <div class="results-info">
          <p>Mostrando <strong>{{ getDisplayRange().start }}-{{ getDisplayRange().end }}</strong> de <strong>{{ getTotalFilteredCount() }}</strong> Pokémon 
            <span *ngIf="getTotalAvailablePokemon() < 151" class="total-available">
              ({{ getTotalAvailablePokemon() }} disponibles de 151 originales)
            </span>
          </p>
          <div *ngIf="hasUserModifications()" class="modifications-info">
            <span class="modifications-badge">✏️ {{ getUserModificationsCount() }} modificaciones activas</span>
          </div>
        </div>
      </div>

      <!-- Type Filter -->
      <div *ngIf="!isLoading" class="type-filter">
        <button 
          class="type-btn"
          [class.active]="selectedType === 'all'"
          (click)="selectType('all')"
        >
          Todos
        </button>
        <button 
          *ngFor="let type of pokemonTypes" 
          class="type-btn"
          [class.active]="selectedType === type.name"
          [style.background-color]="pokemonService.getTypeColor(type.name)"
          (click)="selectType(type.name)"
        >
          {{ type.name | titlecase }}
        </button>
      </div>

      <!-- Pokemon Table -->
      <div *ngIf="!isLoading" class="pokemon-table-container">
        <table class="pokemon-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Tipos</th>
              <th>Altura</th>
              <th>Peso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              *ngFor="let pokemon of filteredPokemon" 
              class="pokemon-row"
              [class.selected]="selectedPokemonId === pokemon.id"
              [class.deleted]="pokemon.isDeleted"
            >
              <td class="pokemon-id">#{{ pokemon.id.toString().padStart(3, '0') }}</td>
              <td class="pokemon-image-cell">
                <img 
                  [src]="pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default" 
                  [alt]="pokemon.name"
                  loading="lazy"
                  class="pokemon-table-image"
                >
              </td>
              <td class="pokemon-name">
                {{ pokemon.name | titlecase }}
                <span *ngIf="pokemon.isModified" class="modified-badge">✎ Editado</span>
                <span *ngIf="isInDeleteCountdown(pokemon)" class="delete-countdown">
                  ⏱️ Eliminando en 5s...
                </span>
              </td>
              <td class="pokemon-types-cell">
                <span 
                  *ngFor="let type of pokemon.types" 
                  class="type-badge small"
                  [style.background-color]="pokemonService.getTypeColor(type.type.name)"
                >
                  {{ type.type.name }}
                </span>
              </td>
              <td class="pokemon-stat">{{ pokemon.height / 10 }} m</td>
              <td class="pokemon-stat">{{ pokemon.weight / 10 }} kg</td>
              <td class="pokemon-actions">
                <div class="action-buttons">
                  <button 
                    class="action-btn view-btn"
                    (click)="selectPokemon(pokemon)"
                    title="Ver detalles"
                  >
                    👁️
                  </button>
                  <button 
                    class="action-btn edit-btn"
                    (click)="editPokemon(pokemon)"
                    title="Editar"
                    [disabled]="pokemon.isDeleted"
                  >
                    ✏️
                  </button>
                  <button 
                    class="action-btn delete-btn"
                    (click)="deletePokemon(pokemon)"
                    [title]="getDeleteButtonTitle(pokemon)"
                  >
                    {{ getDeleteButtonIcon(pokemon) }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Mensaje cuando no hay resultados -->
        <div *ngIf="filteredPokemon.length === 0" class="no-results">
          <p>No se encontraron Pokémon con los filtros aplicados</p>
          <button (click)="clearAllFilters()" class="clear-filters-btn">
            Limpiar filtros
          </button>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div *ngIf="!isLoading && getTotalPages() > 1" class="pagination-container">
        <div class="pagination-info">
          <span>Página {{ currentPage }} de {{ getTotalPages() }}</span>
        </div>
        
        <div class="pagination-controls">
          <!-- Botón Primera Página -->
          <button 
            class="pagination-btn"
            [disabled]="currentPage === 1"
            (click)="goToPage(1)"
            title="Primera página"
          >
            ⏮️
          </button>
          
          <!-- Botón Página Anterior -->
          <button 
            class="pagination-btn"
            [disabled]="currentPage === 1"
            (click)="prevPage()"
            title="Página anterior"
          >
            ⬅️
          </button>
          
          <!-- Números de Página -->
          <button 
            *ngFor="let page of getPageNumbers()"
            class="pagination-btn page-number"
            [class.active]="page === currentPage"
            (click)="goToPage(page)"
          >
            {{ page }}
          </button>
          
          <!-- Botón Página Siguiente -->
          <button 
            class="pagination-btn"
            [disabled]="currentPage === getTotalPages()"
            (click)="nextPage()"
            title="Página siguiente"
          >
            ➡️
          </button>
          
          <!-- Botón Última Página -->
          <button 
            class="pagination-btn"
            [disabled]="currentPage === getTotalPages()"
            (click)="goToPage(getTotalPages())"
            title="Última página"
          >
            ⏭️
          </button>
        </div>

        <!-- Items per page selector -->
        <div class="items-per-page">
          <label for="itemsPerPage">Pokémon por página:</label>
          <select 
            id="itemsPerPage"
            [(ngModel)]="itemsPerPage" 
            (change)="onItemsPerPageChange()"
            class="items-select"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      <!-- Pokemon Detail Modal (Ver/Editar) -->
      <div *ngIf="selectedPokemonDetail" class="modal-overlay" (click)="closeModal()">
        <div class="pokemon-detail" (click)="$event.stopPropagation()">
          <button class="close-btn" (click)="closeModal()">×</button>
          
          <div class="detail-header">
            <img 
              [src]="selectedPokemonDetail.sprites.other['official-artwork'].front_default" 
              [alt]="selectedPokemonDetail.name"
            >
            <div class="detail-info">
              <h2>#{{ selectedPokemonDetail.id.toString().padStart(3, '0') }} {{ selectedPokemonDetail.name | titlecase }}</h2>
              <div class="pokemon-types">
                <span 
                  *ngFor="let type of selectedPokemonDetail.types" 
                  class="type-badge large"
                  [style.background-color]="pokemonService.getTypeColor(type.type.name)"
                >
                  {{ type.type.name }}
                </span>
              </div>
            </div>
          </div>

          <!-- Botones de acción en el modal -->
          <div class="modal-actions" *ngIf="!isEditMode">
            <button class="modal-btn edit-modal-btn" (click)="enableEditMode()">
              ✏️ Editar Pokémon
            </button>
          </div>

          <div class="detail-content">
            <!-- Modo Edición -->
            <div *ngIf="isEditMode" class="edit-form">
              <h3>Editar Pokémon</h3>
              
              <div class="form-group">
                <label>Nombre:</label>
                <input 
                  type="text" 
                  [(ngModel)]="editingPokemon.name" 
                  class="form-input"
                  placeholder="Nombre del Pokémon"
                >
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Altura (dm):</label>
                  <input 
                    type="number" 
                    [(ngModel)]="editingPokemon.height" 
                    class="form-input"
                    min="1"
                    step="1"
                  >
                  <small>{{ editingPokemon.height / 10 }} metros</small>
                </div>
                <div class="form-group">
                  <label>Peso (hg):</label>
                  <input 
                    type="number" 
                    [(ngModel)]="editingPokemon.weight" 
                    class="form-input"
                    min="1"
                    step="1"
                  >
                  <small>{{ editingPokemon.weight / 10 }} kilogramos</small>
                </div>
              </div>

              <div class="form-group">
                <label>Experiencia Base:</label>
                <input 
                  type="number" 
                  [(ngModel)]="editingPokemon.base_experience" 
                  class="form-input"
                  min="1"
                  max="1000"
                >
              </div>

              <!-- Editar Estadísticas -->
              <div class="form-group">
                <label>Estadísticas:</label>
                <div class="stats-edit">
                  <div *ngFor="let stat of editingPokemon.stats" class="stat-edit-item">
                    <label>{{ getStatName(stat.stat.name) }}:</label>
                    <input 
                      type="number" 
                      [(ngModel)]="stat.base_stat" 
                      class="stat-input"
                      min="1"
                      max="255"
                    >
                    <div class="stat-bar-preview">
                      <div 
                        class="stat-fill" 
                        [style.width.%]="(stat.base_stat / 255) * 100"
                        [style.background-color]="getStatColor(stat.base_stat)"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="edit-actions">
                <button class="save-btn" (click)="saveChanges()">
                  💾 Guardar Cambios
                </button>
                <button class="cancel-btn" (click)="cancelEdit()">
                  ❌ Cancelar
                </button>
              </div>
            </div>

            <!-- Modo Visualización -->
            <div *ngIf="!isEditMode">
              <div class="detail-section">
                <h3>Información Básica</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="label">Altura:</span>
                    <span class="value">{{ selectedPokemonDetail.height / 10 }} m</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Peso:</span>
                    <span class="value">{{ selectedPokemonDetail.weight / 10 }} kg</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Experiencia Base:</span>
                    <span class="value">{{ selectedPokemonDetail.base_experience }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-section">
                <h3>Estadísticas</h3>
                <div class="stats-grid">
                  <div *ngFor="let stat of selectedPokemonDetail.stats" class="stat-item">
                    <span class="stat-name">{{ getStatName(stat.stat.name) }}</span>
                    <div class="stat-bar">
                      <div 
                        class="stat-fill" 
                        [style.width.%]="(stat.base_stat / 255) * 100"
                        [style.background-color]="getStatColor(stat.base_stat)"
                      ></div>
                    </div>
                    <span class="stat-value">{{ stat.base_stat }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-section">
                <h3>Habilidades</h3>
                <div class="abilities">
                  <span 
                    *ngFor="let ability of selectedPokemonDetail.abilities" 
                    class="ability-badge"
                    [class.hidden]="ability.is_hidden"
                  >
                    {{ ability.ability.name | titlecase }}
                    <small *ngIf="ability.is_hidden"> (Oculta)</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirmación de eliminación -->
      <div *ngIf="showDeleteConfirm" class="modal-overlay" (click)="cancelDelete()">
        <div class="confirm-dialog" (click)="$event.stopPropagation()">
          <h3>{{ getPokemonToDeleteAction() }} Pokémon</h3>
          <p>
            {{ getPokemonToDeleteMessage() }}
          </p>
          <div class="confirm-actions">
            <button class="confirm-btn" (click)="confirmDelete()">
              {{ getPokemonToDeleteButtonText() }}
            </button>
            <button class="cancel-btn" (click)="cancelDelete()">
              ❌ Cancelar
            </button>
          </div>
        </div>
      </div>
    
  `,
  styles: [`
    .pokemon-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .pokemon-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .pokemon-header h2 {
      margin: 0 0 0.5rem 0;
      color: #2c3e50;
      font-size: 2.5rem;
    }

    .pokemon-header p {
      margin: 0 0 1rem 0;
      color: #6c757d;
      font-size: 1.1rem;
    }

    .user-indicator {
      margin-top: 1rem;
    }

    .user-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      display: inline-block;
    }

    .modifications-info {
      margin-top: 0.5rem;
    }

    .modifications-badge {
      background: #28a745;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 15px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .loading {
      text-align: center;
      padding: 4rem 2rem;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .search-filter-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 15px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }

    .search-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .search-input-container {
      position: relative;
      flex: 1;
    }

    .search-input {
      width: 100%;
      padding: 12px 45px 12px 15px;
      border: none;
      border-radius: 25px;
      font-size: 1rem;
      background: rgba(255,255,255,0.95);
      color: #333;
      transition: all 0.3s ease;
      box-sizing: border-box;
    }

    .search-input:focus {
      outline: none;
      background: white;
      box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
    }

    .search-icon {
      position: absolute;
      right: 15px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1.2rem;
      color: #666;
    }

    .filter-controls {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .sort-select, .order-select {
      padding: 10px 15px;
      border: none;
      border-radius: 20px;
      font-size: 0.9rem;
      background: rgba(255,255,255,0.95);
      color: #333;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .sort-select:focus, .order-select:focus {
      outline: none;
      background: white;
      box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
    }

    .clear-filters-btn, .reset-data-btn {
      background: rgba(255,255,255,0.2);
      color: white;
      border: 2px solid rgba(255,255,255,0.3);
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
      font-size: 0.9rem;
    }

    .clear-filters-btn:hover, .reset-data-btn:hover {
      background: rgba(255,255,255,0.3);
      transform: translateY(-2px);
    }

    .reset-data-btn {
      background: rgba(220, 53, 69, 0.2);
      border-color: rgba(220, 53, 69, 0.5);
    }

    .reset-data-btn:hover {
      background: rgba(220, 53, 69, 0.3);
    }

    .results-info {
      text-align: center;
      color: white;
      margin-top: 1rem;
      font-weight: 500;
    }

    .results-info strong {
      font-weight: 700;
    }

    .total-available {
      color: rgba(255,255,255,0.8);
      font-size: 0.9rem;
      font-weight: 400;
    }

    .type-filter {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 2rem;
      justify-content: center;
    }

    .type-btn {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s;
      text-transform: capitalize;
    }

    .type-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .type-btn.active {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: 2px solid white;
    }

    .pokemon-table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      margin: 1rem 0;
    }

    .pokemon-table {
      width: 100%;
      border-collapse: collapse;
    }

    .pokemon-table th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .pokemon-table th:first-child {
      text-align: center;
    }

    .pokemon-row {
      border-bottom: 1px solid #e9ecef;
      transition: all 0.3s;
    }

    .pokemon-row:hover {
      background-color: #f8f9fa;
    }

    .pokemon-row.selected {
      background-color: #e3f2fd;
      border-left: 4px solid #2196f3;
    }

    .pokemon-row.deleted {
      background-color: #ffebee;
      opacity: 0.7;
    }

    .pokemon-row.deleted td {
      color: #666;
      text-decoration: line-through;
    }

    .pokemon-table td {
      padding: 1rem;
      vertical-align: middle;
    }

    .pokemon-id {
      text-align: center;
      font-weight: 600;
      color: #6c757d;
      font-family: monospace;
    }

    .pokemon-image-cell {
      text-align: center;
      width: 80px;
    }

    .pokemon-table-image {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 8px;
    }

    .pokemon-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 1.1rem;
      position: relative;
    }

    .modified-badge {
      background: #28a745;
      color: white;
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      border-radius: 10px;
      margin-left: 0.5rem;
      font-weight: 500;
    }

    .delete-countdown {
      background: #dc3545;
      color: white;
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      border-radius: 10px;
      margin-left: 0.5rem;
      font-weight: 500;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }

    .pokemon-types-cell {
      min-width: 150px;
    }

    .pokemon-stat {
      color: #6c757d;
      font-weight: 500;
    }

    .pokemon-actions {
      text-align: center;
      width: 150px;
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }

    .action-btn {
      background: white;
      border: 2px solid;
      padding: 0.4rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.3s ease;
      width: 35px;
      height: 35px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .view-btn {
      border-color: #007bff;
      color: #007bff;
    }

    .view-btn:hover {
      background: #007bff;
      color: white;
      transform: translateY(-2px);
    }

    .edit-btn {
      border-color: #28a745;
      color: #28a745;
    }

    .edit-btn:hover:not(:disabled) {
      background: #28a745;
      color: white;
      transform: translateY(-2px);
    }

    .edit-btn:disabled {
      border-color: #ccc;
      color: #ccc;
      cursor: not-allowed;
    }

    .delete-btn {
      border-color: #dc3545;
      color: #dc3545;
    }

    .delete-btn:hover {
      background: #dc3545;
      color: white;
      transform: translateY(-2px);
    }

    .no-results {
      text-align: center;
      padding: 3rem 2rem;
      color: #6c757d;
    }

    .no-results p {
      font-size: 1.2rem;
      margin-bottom: 1rem;
    }

    /* Estilos de Paginación */
    .pagination-container {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-top: 2rem;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: center;
    }

    .pagination-info {
      color: #6c757d;
      font-weight: 500;
      font-size: 0.9rem;
    }

    .pagination-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
    }

    .pagination-btn {
      background: #f8f9fa;
      color: #495057;
      border: 1px solid #dee2e6;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
      min-width: 40px;
      text-align: center;
    }

    .pagination-btn:hover:not(:disabled) {
      background: #e9ecef;
      transform: translateY(-2px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .pagination-btn:disabled {
      background: #f8f9fa;
      color: #adb5bd;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .pagination-btn.page-number {
      min-width: 40px;
      font-weight: 600;
    }

    .pagination-btn.page-number.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .items-per-page {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .items-select {
      padding: 0.4rem 0.8rem;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      background: white;
      color: #495057;
      cursor: pointer;
      font-weight: 500;
    }

    .items-select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.25);
    }

    .pokemon-types {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .type-badge {
      background: #6c757d;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: capitalize;
      margin-right: 0.25rem;
      margin-bottom: 0.25rem;
      display: inline-block;
    }

    .type-badge.small {
      padding: 0.2rem 0.6rem;
      font-size: 0.7rem;
      border-radius: 10px;
    }

    .type-badge.large {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 2rem;
    }

    .pokemon-detail {
      background: white;
      border-radius: 20px;
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      width: 100%;
    }

    .close-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: #e74c3c;
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      font-size: 1.5rem;
      cursor: pointer;
      z-index: 10;
    }

    .detail-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    .detail-header img {
      width: 150px;
      height: 150px;
      object-fit: contain;
      margin-bottom: 1rem;
    }

    .detail-header h2 {
      margin: 0 0 1rem 0;
      font-size: 1.8rem;
    }

    .modal-actions {
      padding: 1rem 2rem 0;
      text-align: center;
      border-bottom: 1px solid #e9ecef;
    }

    .modal-btn {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 25px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
      font-size: 1rem;
    }

    .modal-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .detail-content {
      padding: 2rem;
    }

    .detail-section {
      margin-bottom: 2rem;
    }

    .detail-section h3 {
      margin: 0 0 1rem 0;
      color: #2c3e50;
      font-size: 1.3rem;
    }

    /* Estilos del formulario de edición */
    .edit-form {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }

    .edit-form h3 {
      margin: 0 0 1.5rem 0;
      color: #28a745;
      text-align: center;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #495057;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #28a745;
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.25);
    }

    .form-group small {
      display: block;
      margin-top: 0.25rem;
      color: #6c757d;
      font-size: 0.875rem;
    }

    .stats-edit {
      display: grid;
      gap: 1rem;
    }

    .stat-edit-item {
      display: grid;
      grid-template-columns: 120px 80px 1fr;
      gap: 0.75rem;
      align-items: center;
      background: white;
      padding: 0.75rem;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    }

    .stat-edit-item label {
      margin: 0;
      font-size: 0.9rem;
    }

    .stat-input {
      padding: 0.5rem;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      text-align: center;
      font-weight: 600;
    }

    .stat-input:focus {
      outline: none;
      border-color: #28a745;
    }

    .stat-bar-preview {
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
    }

    .edit-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #dee2e6;
    }

    .save-btn {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 25px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .save-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .cancel-btn {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 25px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .cancel-btn:hover {
      background: #5a6268;
      transform: translateY(-2px);
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .label {
      font-weight: 600;
      color: #495057;
    }

    .value {
      color: #6c757d;
    }

    .stats-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .stat-item {
      display: grid;
      grid-template-columns: 1fr 2fr auto;
      gap: 1rem;
      align-items: center;
    }

    .stat-name {
      font-weight: 600;
      color: #495057;
      text-transform: capitalize;
    }

    .stat-bar {
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
    }

    .stat-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .stat-value {
      font-weight: 600;
      color: #495057;
      min-width: 30px;
      text-align: right;
    }

    .abilities {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .ability-badge {
      background: #17a2b8;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 500;
    }

    .ability-badge.hidden {
      background: #6f42c1;
    }

    /* Estilos del diálogo de confirmación */
    .confirm-dialog {
      background: white;
      border-radius: 15px;
      padding: 2rem;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }

    .confirm-dialog h3 {
      margin: 0 0 1rem 0;
      color: #2c3e50;
    }

    .confirm-dialog p {
      margin: 0 0 2rem 0;
      color: #6c757d;
      line-height: 1.5;
    }

    .confirm-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .confirm-btn {
      background: #dc3545;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 25px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .confirm-btn:hover {
      background: #c82333;
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .search-filter-container {
        padding: 1rem;
      }

      .filter-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .sort-select, .order-select, .clear-filters-btn {
        width: 100%;
      }

      .pokemon-table-container {
        overflow-x: auto;
      }

      .pokemon-table {
        min-width: 700px;
      }

      .pokemon-table th,
      .pokemon-table td {
        padding: 0.75rem 0.5rem;
      }

      .pokemon-table-image {
        width: 50px;
        height: 50px;
      }

      .pokemon-name {
        font-size: 1rem;
      }

      .type-badge.small {
        padding: 0.15rem 0.5rem;
        font-size: 0.6rem;
      }

      .action-buttons {
        flex-direction: column;
        gap: 0.25rem;
      }

      .action-btn {
        width: 30px;
        height: 30px;
        font-size: 0.8rem;
      }

      .modal-overlay {
        padding: 1rem;
      }

      .detail-content {
        padding: 1rem;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .stat-item {
        grid-template-columns: 1fr 1.5fr auto;
        gap: 0.5rem;
      }

      .pagination-container {
        padding: 1rem;
      }

      .pagination-controls {
        gap: 0.25rem;
      }

      .pagination-btn {
        padding: 0.4rem 0.6rem;
        font-size: 0.85rem;
        min-width: 35px;
      }

      .items-per-page {
        flex-direction: column;
        text-align: center;
        gap: 0.25rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .stat-edit-item {
        grid-template-columns: 1fr;
        gap: 0.5rem;
        text-align: center;
      }

      .edit-actions {
        flex-direction: column;
      }

      .confirm-dialog {
        margin: 1rem;
        padding: 1.5rem;
      }

      .confirm-actions {
        flex-direction: column;
      }
    }
  `]
})
export class PokemonListComponent implements OnInit, OnDestroy {
  pokemonList: ExtendedPokemon[] = [];
  filteredPokemon: ExtendedPokemon[] = [];
  pokemonTypes: any[] = [];
  selectedType: string = 'all';
  selectedPokemonId: number | null = null;
  selectedPokemonDetail: ExtendedPokemon | null = null;
  isLoading: boolean = true;

  // Usuario actual
  currentUser: User | null = null;
  private userSubscription: Subscription | null = null;

  // Propiedades para búsqueda y filtrado
  searchTerm: string = '';
  sortBy: string = 'id';
  sortOrder: 'asc' | 'desc' = 'asc';
  
  // Propiedades para paginación
  currentPage: number = 1;
  itemsPerPage: number = 20;
  
  // Para almacenar todos los pokémon filtrados (sin paginación)
  private allFilteredPokemon: ExtendedPokemon[] = [];

  // Propiedades para edición
  isEditMode: boolean = false;
  editingPokemon: ExtendedPokemon = {} as ExtendedPokemon;
  originalPokemon: ExtendedPokemon = {} as ExtendedPokemon;

  // Propiedades para eliminación
  showDeleteConfirm: boolean = false;
  pokemonToDelete: ExtendedPokemon | null = null;
  deleteTimeouts: Map<number, any> = new Map();

  constructor(
    public pokemonService: PokemonService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Suscribirse a los cambios del usuario actual
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      const previousUser = this.currentUser;
      this.currentUser = user;
      
      // Si cambió el usuario, recargar los datos
      if (previousUser?.email !== user?.email) {
        this.loadInitialData();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    
    this.deleteTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.deleteTimeouts.clear();
  }

  // Métodos para generar claves de localStorage específicas del usuario
  private getStorageKey(key: string): string {
    if (!this.currentUser?.email) {
      return key; // Fallback si no hay usuario
    }
    return `${key}_${this.currentUser.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private getUserModificationsKey(): string {
    return this.getStorageKey('pokemon_modifications');
  }

  private getUserDeletedKey(): string {
    return this.getStorageKey('pokemon_deleted');
  }

  // Método para hacer scroll hacia arriba
  private scrollToTop(): void {
    const pokemonTable = document.querySelector('.pokemon-table-container');
    if (pokemonTable) {
      pokemonTable.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }
  }

  // Métodos para manejar localStorage específicos del usuario
  private saveModifications(): void {
    try {
      if (!this.currentUser?.email) {
        console.warn('No hay usuario autenticado para guardar modificaciones');
        return;
      }

      const modifications: any = {};
      const deletedIds: number[] = [];

      this.pokemonList.forEach(pokemon => {
        if (pokemon.isModified) {
          modifications[pokemon.id] = {
            name: pokemon.name,
            height: pokemon.height,
            weight: pokemon.weight,
            base_experience: pokemon.base_experience,
            stats: pokemon.stats.map(stat => ({
              base_stat: stat.base_stat,
              stat: { name: stat.stat.name }
            }))
          };
        }
        if (pokemon.isDeleted && !this.deleteTimeouts.has(pokemon.id)) {
          deletedIds.push(pokemon.id);
        }
      });

      localStorage.setItem(this.getUserModificationsKey(), JSON.stringify(modifications));
      localStorage.setItem(this.getUserDeletedKey(), JSON.stringify(deletedIds));
      
      console.log(`Modificaciones guardadas para usuario: ${this.currentUser.email}`);
    } catch (error) {
      console.warn('No se pudieron guardar las modificaciones:', error);
    }
  }

  private loadSavedModifications(): void {
    try {
      if (!this.currentUser?.email) {
        console.warn('No hay usuario autenticado para cargar modificaciones');
        return;
      }

      const savedModifications = localStorage.getItem(this.getUserModificationsKey());
      const savedDeleted = localStorage.getItem(this.getUserDeletedKey());

      if (savedModifications) {
        const modifications = JSON.parse(savedModifications);
        
        this.pokemonList.forEach((pokemon, index) => {
          if (modifications[pokemon.id]) {
            const mod = modifications[pokemon.id];
            this.pokemonList[index] = {
              ...pokemon,
              name: mod.name,
              height: mod.height,
              weight: mod.weight,
              base_experience: mod.base_experience,
              stats: mod.stats.map((statMod: any, statIndex: number) => ({
                ...pokemon.stats[statIndex],
                base_stat: statMod.base_stat
              })),
              isModified: true
            };
          }
        });
        console.log(`Modificaciones cargadas para usuario: ${this.currentUser.email}`);
      }

      if (savedDeleted) {
        const deletedIds: number[] = JSON.parse(savedDeleted);
        this.pokemonList = this.pokemonList.filter(pokemon => 
          !deletedIds.includes(pokemon.id)
        );
        console.log(`Pokémon eliminados cargados para usuario: ${this.currentUser.email}`);
      }
    } catch (error) {
      console.warn('No se pudieron cargar las modificaciones guardadas:', error);
    }
  }

  private clearSavedData(): void {
    try {
      if (!this.currentUser?.email) {
        console.warn('No hay usuario autenticado para limpiar datos');
        return;
      }

      localStorage.removeItem(this.getUserModificationsKey());
      localStorage.removeItem(this.getUserDeletedKey());
      console.log(`Datos limpiados para usuario: ${this.currentUser.email}`);
    } catch (error) {
      console.warn('No se pudieron limpiar los datos guardados:', error);
    }
  }

  // Método para obtener estadísticas de modificaciones del usuario
  hasUserModifications(): boolean {
    return this.pokemonList.some(pokemon => pokemon.isModified || pokemon.isDeleted);
  }

  getUserModificationsCount(): number {
    return this.pokemonList.filter(pokemon => pokemon.isModified || pokemon.isDeleted).length;
  }

  async loadInitialData(): Promise<void> {
    try {
      this.isLoading = true;
      
      // Limpiar timeouts existentes
      this.deleteTimeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      this.deleteTimeouts.clear();
      
      const pokemonPromises: Promise<Pokemon>[] = [];
      for (let i = 1; i <= 151; i++) {
        pokemonPromises.push(this.pokemonService.getPokemon(i).toPromise() as Promise<Pokemon>);
      }

      const typesResponse = await this.pokemonService.getAllTypes().toPromise();
      this.pokemonTypes = typesResponse?.results?.slice(0, 18) || [];

      const loadedPokemon = await Promise.all(pokemonPromises);
      
      this.pokemonList = loadedPokemon.map(pokemon => ({
        ...pokemon,
        isDeleted: false,
        isModified: false
      } as ExtendedPokemon));

      // Cargar modificaciones específicas del usuario actual
      this.loadSavedModifications();
      this.applyFilters();
      
      this.isLoading = false;
    } catch (error) {
      console.error('Error loading Pokemon data:', error);
      this.isLoading = false;
    }
  }

  selectType(type: string): void {
    this.selectedType = type;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.applyFilters();
    setTimeout(() => this.scrollToTop(), 100);
  }

  applyFilters(): void {
    let filtered = [...this.pokemonList];

    filtered = filtered.filter(pokemon => !this.isDefinitivelyDeleted(pokemon));

    if (this.selectedType !== 'all') {
      filtered = filtered.filter(pokemon =>
        pokemon.types.some(t => t.type.name === this.selectedType)
      );
    }

    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(pokemon =>
        pokemon.name.toLowerCase().includes(searchLower) ||
        pokemon.id.toString().includes(searchLower)
      );
    }

    filtered.sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (this.sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'height':
          valueA = a.height;
          valueB = b.height;
          break;
        case 'weight':
          valueA = a.weight;
          valueB = b.weight;
          break;
        default:
          valueA = a.id;
          valueB = b.id;
          break;
      }

      if (this.sortOrder === 'asc') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
    });

    this.allFilteredPokemon = filtered;
    this.updatePaginatedResults();
  }

  updatePaginatedResults(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.filteredPokemon = this.allFilteredPokemon.slice(startIndex, endIndex);
    this.scrollToTop();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedType = 'all';
    this.sortBy = 'id';
    this.sortOrder = 'asc';
    this.currentPage = 1;
    this.applyFilters();
  }

  selectPokemon(pokemon: ExtendedPokemon): void {
    this.selectedPokemonId = pokemon.id;
    this.selectedPokemonDetail = pokemon;
    this.isEditMode = false;
  }

  closeModal(): void {
    this.selectedPokemonDetail = null;
    this.selectedPokemonId = null;
    this.isEditMode = false;
    this.editingPokemon = {} as ExtendedPokemon;
    this.originalPokemon = {} as ExtendedPokemon;
  }

  editPokemon(pokemon: ExtendedPokemon): void {
    this.selectedPokemonId = pokemon.id;
    this.selectedPokemonDetail = pokemon;
    this.enableEditMode();
  }

  enableEditMode(): void {
    this.isEditMode = true;
    this.originalPokemon = JSON.parse(JSON.stringify(this.selectedPokemonDetail));
    this.editingPokemon = JSON.parse(JSON.stringify(this.selectedPokemonDetail));
  }

  saveChanges(): void {
    const pokemonIndex = this.pokemonList.findIndex(p => p.id === this.editingPokemon.id);
    if (pokemonIndex !== -1) {
      this.pokemonList[pokemonIndex] = { 
        ...this.editingPokemon,
        isModified: true,
        isDeleted: this.pokemonList[pokemonIndex].isDeleted
      };
      
      this.selectedPokemonDetail = this.pokemonList[pokemonIndex];
      this.saveModifications();
      this.applyFilters();
    }
    
    this.isEditMode = false;
    alert('¡Cambios guardados exitosamente para tu usuario!');
  }

  resetAllData(): void {
    if (confirm('¿Estás seguro de que quieres restaurar todos los Pokémon a su estado original? Se perderán todas tus modificaciones y eliminaciones.')) {
      this.clearSavedData();
      
      this.deleteTimeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      this.deleteTimeouts.clear();
      
      this.loadInitialData();
    }
  }

  cancelEdit(): void {
    this.editingPokemon = {} as ExtendedPokemon;
    this.originalPokemon = {} as ExtendedPokemon;
    this.isEditMode = false;
  }

  deletePokemon(pokemon: ExtendedPokemon): void {
    this.pokemonToDelete = pokemon;
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (this.pokemonToDelete) {
      const pokemonIndex = this.pokemonList.findIndex(p => p.id === this.pokemonToDelete!.id);
      if (pokemonIndex !== -1) {
        const pokemon = this.pokemonList[pokemonIndex];
        
        if (pokemon.isDeleted) {
          this.restorePokemon(pokemon);
        } else {
          this.markForDeletion(pokemon);
        }
        
        this.applyFilters();
      }
    }
    this.cancelDelete();
  }

  private markForDeletion(pokemon: ExtendedPokemon): void {
    const pokemonIndex = this.pokemonList.findIndex(p => p.id === pokemon.id);
    if (pokemonIndex !== -1) {
      this.pokemonList[pokemonIndex] = {
        ...this.pokemonList[pokemonIndex],
        isDeleted: true
      };

      this.showUndoMessage(pokemon);

      const timeoutId = setTimeout(() => {
        this.removeFromTable(pokemon.id);
        this.deleteTimeouts.delete(pokemon.id);
      }, 5000);

      this.deleteTimeouts.set(pokemon.id, timeoutId);
    }
  }

  private restorePokemon(pokemon: ExtendedPokemon): void {
    const timeoutId = this.deleteTimeouts.get(pokemon.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.deleteTimeouts.delete(pokemon.id);
    }

    const pokemonIndex = this.pokemonList.findIndex(p => p.id === pokemon.id);
    if (pokemonIndex !== -1) {
      this.pokemonList[pokemonIndex] = {
        ...this.pokemonList[pokemonIndex],
        isDeleted: false
      };
    }
  }

  private removeFromTable(pokemonId: number): void {
    this.pokemonList = this.pokemonList.filter(p => p.id !== pokemonId);
    this.saveModifications();
    this.applyFilters();
  }

  private showUndoMessage(pokemon: ExtendedPokemon): void {
    console.log(`${pokemon.name} será eliminado en 5 segundos. Haz clic en restaurar para deshacer.`);
  }

  undoDelete(pokemonId: number): void {
    const pokemon = this.pokemonList.find(p => p.id === pokemonId);
    if (pokemon && pokemon.isDeleted) {
      this.restorePokemon(pokemon);
      this.applyFilters();
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.pokemonToDelete = null;
  }

  getPokemonToDeleteAction(): string {
    return this.pokemonToDelete?.isDeleted ? 'Restaurar' : 'Eliminar';
  }

  getPokemonToDeleteMessage(): string {
    if (!this.pokemonToDelete) return '';
    
    const pokemonName = this.pokemonToDelete.name.charAt(0).toUpperCase() + this.pokemonToDelete.name.slice(1);
    
    return this.pokemonToDelete.isDeleted
      ? `¿Estás seguro de que quieres restaurar a ${pokemonName}?`
      : `¿Estás seguro de que quieres eliminar a ${pokemonName}? Esta acción se puede deshacer.`;
  }

  getPokemonToDeleteButtonText(): string {
    return this.pokemonToDelete?.isDeleted ? '↻ Restaurar' : '🗑️ Eliminar';
  }

  getDeleteButtonTitle(pokemon: ExtendedPokemon): string {
    return pokemon.isDeleted ? 'Restaurar' : 'Eliminar';
  }

  getDeleteButtonIcon(pokemon: ExtendedPokemon): string {
    return pokemon.isDeleted ? '↻' : '🗑️';
  }

  private isDefinitivelyDeleted(pokemon: ExtendedPokemon): boolean {
    return pokemon.isDeleted === true && !this.deleteTimeouts.has(pokemon.id);
  }

  getTotalAvailablePokemon(): number {
    return this.pokemonList.filter(pokemon => !this.isDefinitivelyDeleted(pokemon)).length;
  }

  isInDeleteCountdown(pokemon: ExtendedPokemon): boolean {
    return pokemon.isDeleted === true && this.deleteTimeouts.has(pokemon.id);
  }

  getStatName(statName: string): string {
    const statNames: { [key: string]: string } = {
      'hp': 'PS',
      'attack': 'Ataque',
      'defense': 'Defensa',
      'special-attack': 'Ataque Esp.',
      'special-defense': 'Defensa Esp.',
      'speed': 'Velocidad'
    };
    return statNames[statName] || statName;
  }

  getStatColor(statValue: number): string {
    if (statValue >= 120) return '#e74c3c';
    if (statValue >= 80) return '#f39c12';
    if (statValue >= 50) return '#f1c40f';
    return '#95a5a6';
  }

  getTotalPages(): number {
    return Math.ceil(this.allFilteredPokemon.length / this.itemsPerPage);
  }

  getTotalFilteredCount(): number {
    return this.allFilteredPokemon.length;
  }

  getDisplayRange(): { start: number, end: number } {
    if (this.allFilteredPokemon.length === 0) {
      return { start: 0, end: 0 };
    }
    
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.allFilteredPokemon.length);
    return { start, end };
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.updatePaginatedResults();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
      this.updatePaginatedResults();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedResults();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const totalPages = this.getTotalPages();
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }
}