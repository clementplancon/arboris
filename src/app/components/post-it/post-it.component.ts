// postit.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { PostIt, PostItService } from '../../services/post-it.service';
import { PostItDialogComponent } from '../dialogs/post-it-dialog/post-it-dialog.component';

@Component({
  selector: 'app-post-it',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule
  ],
  templateUrl: './post-it.component.html',
  styleUrl: './post-it.component.scss'
})
export class PostItComponent implements OnInit, OnDestroy {
  postIts: PostIt[] = [];
  filteredPostIts: PostIt[] = [];
  filterControl = new FormControl('');
  private subscription: Subscription = new Subscription();
  private filterSubscription: Subscription = new Subscription();

  constructor(private postItService: PostItService, private dialog: MatDialog) { }

  ngOnInit(): void {
    this.subscription = this.postItService.getPostIts().subscribe((posts: PostIt[]) => {
      this.postIts = posts;
      this.applyFilter();
    });
    this.filterSubscription = this.filterControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => this.applyFilter());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.filterSubscription.unsubscribe();
  }

  applyFilter(): void {
    const filterValue = this.filterControl.value?.toLowerCase();
    if (!filterValue) {
      this.filteredPostIts = this.postIts;
    } else {
      this.filteredPostIts = this.postIts.filter(post =>
        post.title.toLowerCase().includes(filterValue) ||
        post.text.toLowerCase().includes(filterValue)
      );
    }
  }

  addPostIt(): void {
    const dialogRef = this.dialog.open(PostItDialogComponent, {
      data: {},
      width: '80vw',
      height: '80vh'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.postItService.addPostIt({
          title: result.title,
          text: result.text
        }).then(() => console.log('Post-it added successfully'))
          .catch(error => console.error('Error adding post-it:', error));
      }
    });
  }

  editPostIt(post: PostIt): void {
    const dialogRef = this.dialog.open(PostItDialogComponent, {
      data: { title: post.title, text: post.text },
      width: '80vw',
      height: '80vh'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.postItService.updatePostIt(post.id, result)
          .then(() => console.log('Post-it updated successfully'))
          .catch(error => console.error('Error updating post-it:', error));
      }
    });
  }

  deletePostIt(post: PostIt): void {
    const confirmed = confirm("Êtes-vous sûr de vouloir supprimer ce post-it ?");
    if (confirmed) {
      this.postItService.deletePostIt(post.id)
        .then(() => console.log('Post-it deleted successfully'))
        .catch(error => console.error('Error deleting post-it:', error));
    }
  }
}