import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule, QuillEditorComponent } from 'ngx-quill';
import { FirestoreService } from '../../services/firestore.service';

@Component({
  selector: 'app-editor',
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss'
})
export class EditorComponent implements OnInit, OnDestroy {
  // Valeur initiale
  public editorData: string = '<p>Commencez à saisir votre document ici...</p>';

  // Configuration de Quill (vous pouvez personnaliser la toolbar)
  public modules = {
    toolbar: [
       // ajout surlignage à la toolbar
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }], 
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['clean']
    ]
  };

  @ViewChild('quillEditor') quillEditorComponent!: QuillEditorComponent;

  private inputSubject = new Subject<string>();
  private inputSubscription!: Subscription;

  constructor(private firestoreService: FirestoreService) {}

  ngOnInit(): void {
    // Sauvegarde automatique avec debounce de 1 seconde
    this.inputSubscription = this.inputSubject.pipe(
      debounceTime(1000)
    ).subscribe(content => {
      this.saveContent(content);
    });
    // Charger le contenu sauvegardé depuis Firestore (première émission)
    this.firestoreService.getEditorContent().pipe(take(1)).subscribe(content => {
      if (content && content.trim() !== '') {
        this.editorData = content;
      }
    });
  }

  ngAfterViewInit(): void {
    // Optionnel : vous pouvez accéder ici à l'instance de Quill si besoin
  }

  onContentChanged(event: any): void {
    // event.html contient le contenu HTML de l'éditeur
    this.inputSubject.next(event.html);
  }

  /**
   * Insère le texte à la position actuelle du curseur dans l'éditeur.
   */
  public insertText(text: string): void {
    if (!this.quillEditorComponent || !this.quillEditorComponent.quillEditor) {
      console.error('Editor instance is not ready!');
      return;
    }
    const quill = this.quillEditorComponent.quillEditor;
    let range = quill.getSelection();
    if (range) {
      quill.insertText(range.index, text);
      quill.setSelection(range.index + text.length, 0);
    } else {
      // Si aucune sélection n'est trouvée, ajouter à la fin
      let length = quill.getLength();
      quill.insertText(length - 1, text);
      quill.setSelection(length - 1 + text.length, 0);
    }
  }

  /**
   * Sauvegarde le contenu de l'éditeur dans Firestore.
   */
  saveContent(content: string): void {
    this.firestoreService.saveEditorContent(content)
      .then(() => console.log('Editor content saved successfully'))
      .catch(error => console.error('Error saving editor content:', error));
  }

  ngOnDestroy(): void {
    this.inputSubscription.unsubscribe();
  }
}