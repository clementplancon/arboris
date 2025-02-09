// edit-folder-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TreeNode } from '../../../services/firestore.service';

@Component({
  selector: 'app-edit-folder-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './edit-folder-dialog.component.html',
  styleUrl: './edit-folder-dialog.component.scss'
})
export class EditFolderDialogComponent {
  editForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EditFolderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TreeNode
  ) {
    this.editForm = this.fb.group({
      label: [data.label, Validators.required],
      color: [data.color, Validators.required],
      order: [(data.order ?? 0) + 1, [Validators.required, Validators.min(0)]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.editForm.valid) {
      this.editForm.controls['order'].setValue(parseInt(this.editForm.controls['order'].value, 10) - 1);
      this.dialogRef.close(this.editForm.value);
    }
  }
}