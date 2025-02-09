import { Component, Inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

export interface MoveNodeDialogData {
  currentNodeId: string;
  availableFolders: { id: string; label: string }[];
}

@Component({
  selector: 'app-move-node-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './move-node-dialog.component.html',
  styleUrl: './move-node-dialog.component.scss'
})
export class MoveNodeDialogComponent {
  folderControl = new FormControl(null);

  constructor(
    public dialogRef: MatDialogRef<MoveNodeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MoveNodeDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    // Retourne la valeur sélectionnée (null pour la racine, sinon l'ID du dossier)
    this.dialogRef.close(this.folderControl.value);
  }
}