// postit-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface PostItDialogData {
  title?: string;
  text?: string;
}

@Component({
  selector: 'app-post-it-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './post-it-dialog.component.html',
  styleUrl: './post-it-dialog.component.scss'
})
export class PostItDialogComponent {
  postItForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PostItDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PostItDialogData
  ) {
    this.postItForm = this.fb.group({
      title: [data.title || '', Validators.required],
      text: [data.text || '', Validators.required]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.postItForm.valid) {
      this.dialogRef.close(this.postItForm.value);
    }
  }
}
