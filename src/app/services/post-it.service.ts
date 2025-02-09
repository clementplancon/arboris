// postit.service.ts
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, query, orderBy, collectionData, doc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface PostIt {
  id: string;
  title: string;
  text: string;
  createdAt: any; // Date ou Timestamp Firestore
}

@Injectable({
  providedIn: 'root'
})
export class PostItService {
  private firestore = inject(Firestore);

  addPostIt(postIt: { title: string; text: string }): Promise<any> {
    const data = {
      title: postIt.title,
      text: postIt.text,
      createdAt: new Date()
    };
    const collectionRef = collection(this.firestore, 'postits');
    return addDoc(collectionRef, data);
  }

  updatePostIt(id: string, data: Partial<PostIt>): Promise<void> {
    const docRef = doc(this.firestore, `postits/${id}`);
    return updateDoc(docRef, data);
  }

  deletePostIt(id: string): Promise<void> {
    const docRef = doc(this.firestore, `postits/${id}`);
    return deleteDoc(docRef);
  }

  getPostIts(): Observable<PostIt[]> {
    const collectionRef = collection(this.firestore, 'postits');
    const q = query(collectionRef, orderBy('createdAt'));
    return collectionData(q, { idField: 'id' }) as Observable<PostIt[]>;
  }
}
