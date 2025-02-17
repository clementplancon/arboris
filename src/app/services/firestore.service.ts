// firestore.service.ts
import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  collectionData,
  getDoc,
  docData
} from '@angular/fire/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { setDoc } from 'firebase/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interface représentant un noeud de l'arbre (dossier ou document).
 */
export interface TreeNode {
  id: string;
  type: 'folder' | 'document';
  label: string;
  color?: string;
  content?: string;
  tags?: string[];
  parentId?: string;   // Si undefined ou null, le noeud est considéré racine.
  order?: number;      // Pour définir l'ordre parmi les siblings.
  createdAt?: any;     // On peut utiliser Date ou Timestamp de Firestore.
  children?: TreeNode[];
}

export interface CurrentEditorContent {
  content: string;
  updatedAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore = inject(Firestore);
  private snackbar = inject(MatSnackBar);

  // Méthode de sauvegarde existante
  async saveEditorContent(content: string): Promise<void> {
    const editorDocRef = doc(this.firestore, 'editorContent/current');
    const currentEditorContent: CurrentEditorContent = { content, updatedAt: new Date() };
    try {
      await setDoc(editorDocRef, currentEditorContent, { merge: true });
      this.snackbar.open('Contenu sauvegardé.', 'Fermer', { duration: 2000, data: { type: 'success' } });
    }
    catch (error) {
      this.snackbar.open('Erreur lors de la sauvegarde du contenu.', 'Fermer', { duration: 2000, data: { type: 'error' } });
    }
  }

  /**
   * Récupère le contenu de l'éditeur sauvegardé dans Firestore.
   * On suppose que le document est stocké dans la collection "editorContent" avec l'ID "current".
   */
  getEditorContent(): Observable<string> {
    const editorDocRef = doc(this.firestore, 'editorContent/current');
    return (docData(editorDocRef) as Observable<CurrentEditorContent>).pipe(
      map(data => data && data.content ? data.content : '')
    );
  }

  /**
   * Ajoute un dossier dans la collection "folders".
   * Si folder.parentId est undefined, la propriété n'est pas incluse.
   * @param folder - Objet contenant label, couleur, (optionnellement parentId et order).
   * @returns Une promesse renvoyée par addDoc.
   */
  async addFolder(folder: { label: string; color: string; parentId?: string; order?: number }): Promise<any> {
    const folderData = {
      label: folder.label,
      color: folder.color,
      type: 'folder' as const,
      createdAt: new Date(),
      ...(folder.parentId !== undefined ? { parentId: folder.parentId } : {}),
      ...(folder.order !== undefined ? { order: folder.order } : {})
    };
    const foldersCollection = collection(this.firestore, 'folders');
    return addDoc(foldersCollection, folderData);
  }

  /**
   * Ajoute un document dans la collection "documents".
   * Remarque : Un document peut être ajouté uniquement à l'intérieur d'un dossier.
   * @param document - Objet contenant label, content, tags, parentId et optionnellement order.
   * @returns Une promesse renvoyée par addDoc.
   */
  async addDocument(document: { label: string; content: string; tags: string[]; parentId: string; order?: number }): Promise<any> {
    const documentData = {
      content: document.content,
      tags: document.tags,
      type: 'document' as const,
      // On réutilise le champ "label" pour le titre du document.
      label: document.label,
      createdAt: new Date(),
      ...(document.parentId !== undefined ? { parentId: document.parentId } : {}),
      ...(document.order !== undefined ? { order: document.order } : {})
    };
    const documentsCollection = collection(this.firestore, 'documents');
    return addDoc(documentsCollection, documentData);
  }

  /**
   * Met à jour un dossier dans la collection "folders".
   * Filtre au préalable les champs undefined.
   */
  updateFolder(id: string, data: Partial<TreeNode>): Promise<void> {
    const filteredData = this.filterUndefined(data);
    const folderDocRef = doc(this.firestore, `folders/${id}`);
    return updateDoc(folderDocRef, filteredData);
  }

  /**
   * Met à jour un document dans la collection "documents".
   */
  updateDocument(id: string, data: Partial<TreeNode>): Promise<void> {
    const filteredData = this.filterUndefined(data);
    console.log('filteredData', filteredData);
    const documentDocRef = doc(this.firestore, `documents/${id}`);
    return updateDoc(documentDocRef, filteredData);
  }

  /**
   * Supprime un dossier dans la collection "folders".
   */
  deleteFolder(id: string): Promise<void> {
    const folderDocRef = doc(this.firestore, `folders/${id}`);
    return deleteDoc(folderDocRef);
  }

  /**
   * Supprime un document dans la collection "documents".
   */
  deleteDocument(id: string): Promise<void> {
    const documentDocRef = doc(this.firestore, `documents/${id}`);
    return deleteDoc(documentDocRef);
  }

  /**
   * Récupère tous les dossiers depuis Firestore sous forme d'observable.
   * Les dossiers sont ordonnés par date de création.
   */
  getFolders(): Observable<TreeNode[]> {
    const foldersCollection = collection(this.firestore, 'folders');
    const foldersQuery = query(foldersCollection, orderBy('createdAt'));
    return collectionData(foldersQuery, { idField: 'id' }) as Observable<TreeNode[]>;
  }

  /**
   * Récupère tous les documents depuis Firestore sous forme d'observable.
   * Les documents sont ordonnés par date de création.
   */
  getDocuments(): Observable<TreeNode[]> {
    const documentsCollection = collection(this.firestore, 'documents');
    const documentsQuery = query(documentsCollection, orderBy('createdAt'));
    return collectionData(documentsQuery, { idField: 'id' }) as Observable<TreeNode[]>;
  }

  /**
   * Combine les dossiers et documents pour reconstruire l'arborescence.
   * Seuls les noeuds dont parentId est absent sont considérés racines.
   */
  getTree(): Observable<TreeNode[]> {
    return combineLatest([this.getFolders(), this.getDocuments()]).pipe(
      map(([folders, documents]) => {
        // Combine tous les noeuds en un seul tableau, en initialisant children à un tableau vide.
        const nodes: TreeNode[] = [
          ...folders.map(node => ({ ...node, children: [] })),
          ...documents.map(node => ({ ...node, children: [] }))
        ];

        // Optionnel : trier les noeuds par le champ "order" s'il existe.
        nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // Crée une table de hachage pour accéder rapidement aux noeuds par leur id.
        const nodeMap = new Map<string, TreeNode>();
        nodes.forEach(node => nodeMap.set(node.id, node));

        // Reconstruction de l'arborescence
        const tree: TreeNode[] = [];
        nodes.forEach(node => {
          if (node.parentId) {
            const parent = nodeMap.get(node.parentId);
            // Seuls les dossiers peuvent être parents : si le parent existe et est un folder, on ajoute l'enfant.
            if (parent && parent.type === 'folder') {
              parent.children!.push(node);
            } else {
              // Sinon, on considère ce noeud comme racine.
              tree.push(node);
            }
          } else {
            tree.push(node);
          }
        });
        return tree;
      })
    );
  }

  /**
   * Déplace un noeud (folder ou document) vers un nouveau parent et met à jour son ordre.
   * Pour un document ou un folder, le nouveau parent (newParentId) doit être un dossier (ou null pour les dossiers racines).
   * @param node Le noeud à déplacer.
   * @param newParentId L'ID du nouveau parent ou null pour un noeud racine (applicable uniquement pour les folders).
   * @param newOrder Le nouvel ordre parmi les siblings.
   * @throws Une erreur si le nouveau parent n'existe pas ou n'est pas un dossier.
   */
  async moveNode(node: TreeNode, newParentId: string | null, newOrder: number): Promise<void> {
    if (newParentId) {
      // Vérifier que le nouveau parent existe et qu'il s'agit d'un folder.
      const parentDocRef = doc(this.firestore, `folders/${newParentId}`);
      const parentDoc = await getDoc(parentDocRef);
      if (!parentDoc.exists() || (parentDoc.data() as any).type !== 'folder') {
        throw new Error('Le nouveau parent doit être un dossier.');
      }
    }
    const updateData: Partial<TreeNode> = {
      parentId: newParentId !== null ? newParentId : undefined,
      order: newOrder
    };
    if (node.type === 'folder') {
      return this.updateFolder(node.id, updateData);
    } else if (node.type === 'document') {
      return this.updateDocument(node.id, updateData);
    }
  }

  /**
   * Filtre un objet pour supprimer les champs dont la valeur est undefined.
   * @param data L'objet à filtrer.
   * @returns Un nouvel objet sans champs undefined.
   */
  private filterUndefined(data: any): any {
    return Object.keys(data).reduce((acc: any, key: string) => {
      if (data[key] !== undefined) {
        acc[key] = data[key];
      }
      return acc;
    }, {});
  }
}
