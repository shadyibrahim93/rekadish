import { createContext, useContext, useState } from 'react';
import dynamic from 'next/dynamic';

// 1. Lazy load the Shell (The white box & backdrop)
const VRModal = dynamic(() => import('./VRModal'), {
  ssr: false
});

// 2. Lazy load the Content (The ingredients form)
const CreateFromIngredients = dynamic(() => import('./CreateFromIngredients'), {
  ssr: false
});

const CreateMealPlanner = dynamic(() => import('./MealPlanner'), {
  ssr: false
});

const ModalContext = createContext();

export function ModalProvider({ children }) {
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [showMealPlanner, setShowMealPlanner] = useState(false);

  return (
    <ModalContext.Provider
      value={{
        showIngredientsModal,
        setShowIngredientsModal,
        showMealPlanner,
        setShowMealPlanner
      }}
    >
      {children}

      {/* 3. Render them together only when needed */}
      {showIngredientsModal && (
        <VRModal onClose={() => setShowIngredientsModal(false)}>
          <CreateFromIngredients />
        </VRModal>
      )}

      {/* 3. Render them together only when needed */}
      {showMealPlanner && (
        <VRModal onClose={() => setShowMealPlanner(false)}>
          <CreateMealPlanner />
        </VRModal>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}
