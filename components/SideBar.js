import MealPlanner from './MealPlanner';
import AdSlot from './AdSlot';
import ProductsWeUse from './RecipePage/ProductsWeUse';

const SideBar = () => {
  return (
    <aside className='vr-sidebar'>
      <MealPlanner />
      <ProductsWeUse />
      <AdSlot
        id='101'
        position='sidebar'
        placement='sticky'
        height='auto'
      />
    </aside>
  );
};

export default SideBar;
