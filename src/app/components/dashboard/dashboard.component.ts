import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { trigger, transition, style, animate } from '@angular/animations';
import {DragDropModule} from '@angular/cdk/drag-drop';
import { FirestoreService, TreeNode } from '../../services/firestore.service';
import { FolderDialogComponent } from '../dialogs/folder-dialog/folder-dialog.component';
import { DocumentDialogComponent } from '../dialogs/document-dialog/document-dialog.component';
import { EditFolderDialogComponent } from '../dialogs/edit-folder-dialog/edit-folder-dialog.component';
import { MoveNodeDialogComponent } from '../dialogs/move-node-dialog/move-node-dialog.component';
import { PostItComponent } from '../post-it/post-it.component';
import { EditDocumentDialogComponent } from '../dialogs/edit-document-dialog/edit-document-dialog.component';
import { EditorComponent } from '../editor/editor.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { or } from 'firebase/firestore';

export interface DisplayTreeNode extends TreeNode {
  children: DisplayTreeNode[];  // Toujours défini (au moins un tableau vide)
  level: number;
  expanded: boolean;  // État d'expansion
}

@Component({
  standalone: true,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('toggleChildren', [
      transition(':enter', [
        style({ height: '0px', opacity: 0 }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: '0px', opacity: 0 }))
      ])
    ])
  ],
  imports: [CommonModule, MatIconModule, MatButtonModule, PostItComponent, DragDropModule, EditorComponent, FormsModule,
      MatFormFieldModule,
      MatInputModule,]
})
export class DashboardComponent implements OnInit, OnDestroy {
  treeData: DisplayTreeNode[] = [];
  filteredTreeData: DisplayTreeNode[] = [];

  filterText: string = '';
  private subscription: Subscription = new Subscription();
  private expansionState: { [id: string]: boolean } = {};
  isRightPaneClosed: boolean = false;
  isLeftPaneClosed: boolean = false;

  // Récupérer la référence à l'éditeur via le template
  @ViewChild('editor') editorComponent!: EditorComponent;

  constructor(private firestoreService: FirestoreService, private dialog: MatDialog) { }

  ngOnInit(): void {
    this.loadExpansionState();
    this.subscription = this.firestoreService.getTree().subscribe((tree: TreeNode[]) => {
      console.log('Arbre reçu:', tree);
      this.treeData = this.transformTree(tree, 0);
      // Initialement, aucun filtre appliqué : filteredTreeData prend toute l'arborescence
      this.filteredTreeData = this.treeData;
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleRightPane(): void {
    this.isRightPaneClosed = !this.isRightPaneClosed;
  }

  toggleLeftPane(): void {
    this.isLeftPaneClosed = !this.isLeftPaneClosed;
  }

  toggleExpand(node: DisplayTreeNode): void {
    node.expanded = !node.expanded;
    // Sauvegarder l'état d'expansion dans notre objet et dans le localStorage
    this.expansionState[node.id] = node.expanded;
    localStorage.setItem('folderExpansionState', JSON.stringify(this.expansionState));
  }
  /**
   * Méthode de filtrage de l'arborescence.
   * Recherche dans les labels des folders, dans le label des documents et dans leurs tags.
   */
  applyFilter(): void {
    const search = this.filterText.trim().toLowerCase();
    if (!search) {
      this.filteredTreeData = this.treeData;
    } else {
      this.filteredTreeData = this.filterNodes(this.treeData, search);
    }
  }

  /**
   * Filtre récursivement les noeuds selon le texte de recherche.
   */
  private filterNodes(nodes: DisplayTreeNode[], search: string): DisplayTreeNode[] {
    const filtered = nodes.map(node => {
      let match = false;
      if (node.type === 'folder') {
        match = node.label.toLowerCase().includes(search);
      } else if (node.type === 'document') {
        match = (node.label.toLowerCase().includes(search) ||
                (node.tags && node.tags.some(tag => tag.toLowerCase().includes(search)))) ?? false;
      }
      // Filtrer les enfants récursivement, si c'est un folder
      let filteredChildren: DisplayTreeNode[] = [];
      if (node.type === 'folder' && node.children && node.children.length > 0) {
        filteredChildren = this.filterNodes(node.children, search);
      }
      // Si le noeud lui-même correspond ou s'il a des enfants correspondants, on le conserve
      if (match || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    }).filter(node => node !== null) as DisplayTreeNode[];
    return filtered;
  }

  private loadExpansionState(): void {
    const saved = localStorage.getItem('folderExpansionState');
    if (saved) {
      try {
        this.expansionState = JSON.parse(saved);
      } catch (e) {
        console.error('Erreur lors du chargement de l\'état d\'expansion:', e);
        this.expansionState = {};
      }
    }
  }

  private transformTree(nodes: TreeNode[], level: number): DisplayTreeNode[] {
    return nodes.map(node => {
      // Pour chaque folder, initialiser l'état d'expansion à partir du localStorage
      const expanded = node.type === 'folder' ? (this.expansionState[node.id] ?? false) : false;
      const displayNode: DisplayTreeNode = { ...node, level: level, children: [], expanded: expanded };
      if (node.type === 'folder' && node.children && node.children.length > 0) {
        displayNode.children = this.transformTree(node.children, level + 1);
      }
      return displayNode;
    });
  }

  /**
   * Met à jour l'ordre des siblings (dossiers et documents) dans la même liste que le folder modifié.
   * On recherche la liste des siblings (dans treeData ou dans parent.children) et on réattribue les ordres.
   */
  updateSiblingOrders(node: DisplayTreeNode, newOrder: number): void {
    let siblings: DisplayTreeNode[] = [];
    if (!node.parentId) {
      siblings = this.treeData;
    } else {
      const parentNode = this.findNodeById(this.treeData, node.parentId);
      if (parentNode && parentNode.children) {
        siblings = parentNode.children;
      }
    }
    // Retirer le node des siblings
    siblings = siblings.filter(sib => sib.id !== node.id);
    // Insérer le node à la nouvelle position (clampé)
    const clampedOrder = Math.max(0, Math.min(newOrder, siblings.length));
    siblings.splice(clampedOrder, 0, node);
    // Mettre à jour l'ordre de chaque sibling
    siblings.forEach((sib, index) => {
      console.log(sib, index);
      if (sib.order !== index) {
        sib.order = index;
        if (sib.type === 'folder') {
          this.firestoreService.updateFolder(sib.id, { order: index })
            .then(() => console.log(`Folder ${sib.id} order updated to ${index}`))
            .catch(error => console.error(`Error updating order for folder ${sib.id}:`, error));
        } else {
          this.firestoreService.updateDocument(sib.id, { order: index })
            .then(() => console.log(`Document ${sib.id} order updated to ${index}`))
            .catch(error => console.error(`Error updating order for document ${sib.id}:`, error));
        }
      }
    });
  }

  /**
   * Recherche récursive d'un noeud par son ID.
   */
  findNodeById(nodes: DisplayTreeNode[], id: string): DisplayTreeNode | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children) {
        const found = this.findNodeById(node.children, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Ouvre la dialog de déplacement.
   * Elle passe à la dialog la liste des dossiers disponibles (hors le noeud à déplacer, et éventuellement ses descendants).
   */
  openMoveDialog(node: DisplayTreeNode): void {
    const availableFolders = this.getAvailableFolders(node);
    const dialogRef = this.dialog.open(MoveNodeDialogComponent, {
      data: {
        currentNodeId: node.id,
        availableFolders: availableFolders
      },
      width: '30vw',
    });
    dialogRef.afterClosed().subscribe((selectedFolderId: string | null) => {
      // selectedFolderId === null signifie "Racine"
      if (selectedFolderId !== undefined) {
        // Pour le nouvel ordre, on pourrait déterminer la longueur de la liste du dossier destination.
        // Ici, pour simplifier, on met 0.
        const newOrder = 0;
        this.firestoreService.moveNode(node, selectedFolderId, newOrder)
          .then(() => console.log(`Node ${node.id} moved successfully to ${selectedFolderId}`))
          .catch(error => console.error(`Error moving node ${node.id}:`, error));
      }
    });
  }

  deleteElement(node: DisplayTreeNode): void {
    // Si l'élément est un folder et qu'il a des enfants, on ne le supprime pas.
    if (node.type === 'folder' && node.children && node.children.length > 0) {
      alert("Impossible de supprimer cet élément car il contient des sous-éléments.");
      return;
    }
  
    // Pour les éléments sans enfants (folder sans enfant ou document), demande confirmation.
    const confirmed = confirm("Êtes-vous sûr de vouloir supprimer cet élément ?");
    if (!confirmed) {
      return;
    }
  
    // Appel de la méthode de suppression dans le service en fonction du type de l'élément.
    if (node.type === 'folder') {
      this.firestoreService.deleteFolder(node.id)
        .then(() => console.log(`Folder ${node.id} supprimé avec succès`))
        .catch(error => console.error(`Erreur lors de la suppression du folder ${node.id}:`, error));
    } else {
      this.firestoreService.deleteDocument(node.id)
        .then(() => console.log(`Document ${node.id} supprimé avec succès`))
        .catch(error => console.error(`Erreur lors de la suppression du document ${node.id}:`, error));
    }
  }

  /**
   * Retourne une liste plate des dossiers disponibles pour le déplacement.
   * On exclut le dossier courant (et éventuellement ses descendants pour éviter des cycles).
   */
  getAvailableFolders(currentNode: DisplayTreeNode): { id: string, label: string }[] {
    const folders: { id: string, label: string }[] = [];
    const traverse = (nodes: DisplayTreeNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'folder') {
          // Exclure le noeud courant
          if (node.id !== currentNode.id) {
            folders.push({ id: node.id, label: node.label });
          }
          if (node.children) {
            traverse(node.children);
          }
        }
      });
    };
    traverse(this.treeData);
    return folders;
  }

  addFolder(parent: DisplayTreeNode | null): void {
    const dialogRef = this.dialog.open(FolderDialogComponent, {
      data: { parentId: parent ? parent.id : null },
      width: '30vw',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.firestoreService.addFolder({
          label: result.label,
          color: result.color,
          parentId: parent ? parent.id : undefined,
          order: parent ? (parent.children?.length ?? 0) : this.treeData.length
        })
          .then(() => console.log('Folder added successfully'))
          .catch(error => console.error('Error adding folder:', error));
      }
    });
  }

  /**
   * Ouvre la dialog d'édition pour un folder.
   */
  openEditFolderDialog(node: DisplayTreeNode): void {
    const dialogRef = this.dialog.open(EditFolderDialogComponent, {
      data: {
        id: node.id,
        label: node.label,
        color: node.color,
        order: node.order || 0,
        parentId: node.parentId || null
      },
      width: '30vw',
    });
    dialogRef.afterClosed().subscribe((updatedData: Partial<TreeNode> | undefined) => {
      if (updatedData) {
        const newOrder = Number(updatedData.order);
        const oldOrder = node.order || 0;
        // Mettre à jour le folder dans Firestore
        this.firestoreService.updateFolder(node.id, updatedData)
          .then(() => {
            console.log(`Folder ${node.id} updated successfully`);
            // Si l'ordre a changé, mettre à jour les ordres des siblings
            if (newOrder !== oldOrder) {
              this.updateSiblingOrders(node, newOrder);
            }
          })
          .catch(error => console.error(`Error updating folder ${node.id}:`, error));
      }
    });
  }

  addDocument(parent: DisplayTreeNode): void {
    const dialogRef = this.dialog.open(DocumentDialogComponent, {
      data: { parentId: parent.id },
      width: '75vw',
      height: '95vh',
      
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.firestoreService.addDocument({
          label: result.label,
          content: result.content,
          tags: result.tags,
          parentId: parent.id,
          order: (parent.children?.length ?? 0)
        })
          .then(() => console.log('Document added successfully'))
          .catch(error => console.error('Error adding document:', error));
      }
    });
  }

openEditDocumentDialog(node: DisplayTreeNode): void {
  if (node.type !== 'document') return;
  const dialogRef = this.dialog.open(EditDocumentDialogComponent, {
    data: {
      id: node.id,
      label: node.label, 
      content: node.content,
      order: node.order || 0,
      tags: node.tags || [],
      parentId: node.parentId
    },
    width: '75vw',
    height: '95vh'
  });
  dialogRef.afterClosed().subscribe((updatedData: any | undefined) => {
    if (updatedData) {
      const newOrder = Number(updatedData.order);
      const oldOrder = node.order || 0;
      console.log('Données mises à jour:', updatedData);
      this.firestoreService.updateDocument(node.id, updatedData)
        .then(() => {
          console.log(`Document ${node.id} updated successfully`);
          
          if (newOrder !== oldOrder) {
            this.updateSiblingOrders(node, newOrder - 1);
          }
        })
        .catch(error => console.error(`Error updating document ${node.id}:`, error));
    }
  });
}

  /**
   * Insère le contenu d'un document dans l'éditeur à la position du curseur.
   */
  addDocumentToEditor(node: DisplayTreeNode): void {
    if (node.type !== 'document') return;
    if (!node.content) {
      alert("Ce document ne contient aucun texte à insérer.");
      return;
    }
    if (this.editorComponent) {
      this.editorComponent.insertText(node.content);
    } else {
      console.error("L'éditeur n'est pas accessible.");
    }
  }
}