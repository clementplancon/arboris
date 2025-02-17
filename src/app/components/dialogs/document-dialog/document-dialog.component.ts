import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-document-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
],
  templateUrl: './document-dialog.component.html',
  styleUrl: './document-dialog.component.scss'
})
export class DocumentDialogComponent {
  documentForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DocumentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { parentId: string }
  ) {
    this.documentForm = this.fb.group({
      label: ['', Validators.required],
      content: ['', Validators.required],
      tags: ['']
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.documentForm.valid) {
      const formValue = this.documentForm.value;
      // Convertir la chaîne de tags en tableau
      formValue.tags = formValue.tags
        ? formValue.tags.split(',').map((tag: string) => tag.trim())
        : [];
      this.dialogRef.close(formValue);
    }
  }
}
