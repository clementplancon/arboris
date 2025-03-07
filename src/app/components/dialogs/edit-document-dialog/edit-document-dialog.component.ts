import { AfterViewChecked, AfterViewInit, Component, ElementRef, Inject, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Subscription } from 'rxjs';

export interface EditDocumentDialogData {
  id: string;
  label: string;
  content: string;
  tags: string[];
  order: number;
  parentId: string;
}

@Component({
  selector: 'app-edit-document-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './edit-document-dialog.component.html',
  styleUrl: './edit-document-dialog.component.scss'
})
export class EditDocumentDialogComponent {
  editForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditDocumentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditDocumentDialogData
  ) {
    // Pré-remplissage du formulaire.
    // Pour le champ "tags", on convertit le tableau en chaîne séparée par des virgules.
    this.editForm = this.fb.group({
      label: [data.label, Validators.required],
      content: [data.content, Validators.required],
      tags: [data.tags ? data.tags.join(', ') : ''],
      order: [(data.order ?? 0) + 1, [Validators.required, Validators.min(0)]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.editForm.valid) {
      const formValue = this.editForm.value;
      // Conversion de la chaîne de tags en tableau.
      this.editForm.controls['order'].setValue(parseInt(this.editForm.controls['order'].value, 10) - 1);
      formValue.tags = formValue.tags ? formValue.tags.split(',').map((tag: string) => tag.trim()) : [];
      this.dialogRef.close(formValue);
    }
  }
}
